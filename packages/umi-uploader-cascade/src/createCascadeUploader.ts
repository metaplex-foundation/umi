/* eslint-disable no-await-in-loop */
import {
  Context,
  createGenericFileFromJson,
  GenericFile,
  lamports,
  SolAmount,
  UploaderInterface,
  UploaderUploadOptions,
} from '@metaplex-foundation/umi';
import FormData from 'form-data';
import fetch from 'node-fetch';

const DEFAULT_ENDPOINT = 'https://api.lumera.help';

export type CascadeUploaderOptions = {
  /**
   * Bearer key for the gateway's `/upload*` routes. The hosted gateway
   * authenticates and meters every inscription against this key.
   */
  apiKey: string;
  /**
   * Base URL of a cascade-api gateway. Defaults to the hosted gateway at
   * `https://api.lumera.help`.
   */
  endpoint?: string;
  /**
   * `'file'` (default): one Cascade action per file — every URI is
   * `{endpoint}/download/{action_id}`.
   * `'archive'`: all files from a single `upload()` call are packed into one
   * Cascade action — URIs are `{endpoint}/download/{action_id}/{fileName}` and
   * the base fee is paid once for the whole batch. Use this for large
   * collections (one fee instead of thousands).
   */
  mode?: 'file' | 'archive';
};

export type CascadeEstimate = {
  totalUlume: bigint;
  items: Array<{ bytes: number; feeUlume: bigint }>;
};

type UploadResponse = { action_id?: string };
type EstimateResponse = {
  total_ulume?: number | string;
  items?: Array<{ bytes: number; fee_ulume: number | string }>;
};

export function createCascadeUploader(
  context: Pick<Context, 'rpc' | 'payer'>,
  options: CascadeUploaderOptions = { apiKey: '' }
): UploaderInterface & {
  /** Quotes the gateway's ulume (LUME) cost for a list of byte sizes. */
  estimate: (sizes: number[]) => Promise<CascadeEstimate>;
  /** The ulume the gateway will spend inscribing these files. */
  getUploadPriceUlume: (files: GenericFile[]) => Promise<bigint>;
} {
  const { apiKey, mode = 'file' } = options;
  const endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, '');

  if (!apiKey) {
    throw new Error('Cascade Gateway API key is required');
  }

  const failure = (
    method: string,
    path: string,
    status: number,
    body: string
  ): Error =>
    new Error(
      `cascade-api ${method} ${path} failed: HTTP ${status} ${body.slice(
        0,
        500
      )}`
    );

  const postForm = async <T>(path: string, body: FormData): Promise<T> => {
    const res = await fetch(`${endpoint}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });
    const text = await res.text();
    if (!res.ok) throw failure('POST', path, res.status, text);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `cascade-api ${path} returned non-JSON: ${text.slice(0, 200)}`
      );
    }
  };

  const getJson = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${endpoint}${path}`);
    const text = await res.text();
    if (!res.ok) throw failure('GET', path, res.status, text);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `cascade-api ${path} returned non-JSON: ${text.slice(0, 200)}`
      );
    }
  };

  const uploadOne = async (file: GenericFile): Promise<string> => {
    const body = new FormData();
    body.append('file', Buffer.from(file.buffer), file.fileName);
    const data = await postForm<UploadResponse>('/upload', body);
    if (!data.action_id) {
      throw new Error(
        `cascade-api /upload returned no action_id for ${file.fileName}`
      );
    }
    return `${endpoint}/download/${data.action_id}`;
  };

  const uploadFiles = async (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ): Promise<string[]> => {
    const uris: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      uris.push(await uploadOne(files[i]));
      options?.onProgress?.((i + 1) / files.length);
    }
    return uris;
  };

  const uploadArchive = async (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ): Promise<string[]> => {
    const seen = new Set<string>();
    files.forEach((file) => {
      if (seen.has(file.fileName)) {
        throw new Error(
          `archive mode needs unique file names, got "${file.fileName}" ` +
            'twice — rename the files or use mode: "file"'
        );
      }
      seen.add(file.fileName);
    });
    const body = new FormData();
    // cascade-api requires non-file fields to precede the first `files` part.
    body.append('name', 'umi-upload');
    files.forEach((file) => {
      // Use `filepath`, not `filename`: form-data strips directories from
      // `filename`, but cascade-api derives each archive entry's path from the
      // raw Content-Disposition filename, so the folder path must survive.
      body.append('files', Buffer.from(file.buffer), {
        filepath: file.fileName,
      });
    });
    const data = await postForm<UploadResponse>('/upload/folder', body);
    if (!data.action_id) {
      throw new Error('cascade-api /upload/folder returned no action_id');
    }
    options?.onProgress?.(1);
    return files.map(
      (file) => `${endpoint}/download/${data.action_id}/${file.fileName}`
    );
  };

  const upload = async (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ): Promise<string[]> => {
    if (files.length === 0) return [];
    return mode === 'archive' && files.length > 1
      ? uploadArchive(files, options)
      : uploadFiles(files, options);
  };

  const uploadJson = async <T>(json: T): Promise<string> =>
    // Metadata is always inscribed as its own action so its URI stays stable
    // regardless of the mode used for the media files it points at.
    uploadOne(createGenericFileFromJson(json));

  const estimate = async (sizes: number[]): Promise<CascadeEstimate> => {
    if (sizes.length === 0) return { totalUlume: BigInt(0), items: [] };
    const query = sizes.map((size) => Math.max(0, Math.ceil(size))).join(',');
    const data = await getJson<EstimateResponse>(`/estimate?bytes=${query}`);
    return {
      totalUlume: BigInt(data.total_ulume ?? 0),
      items: (data.items ?? []).map((item) => ({
        bytes: item.bytes,
        feeUlume: BigInt(item.fee_ulume),
      })),
    };
  };

  const getUploadPriceUlume = async (files: GenericFile[]): Promise<bigint> => {
    if (files.length === 0) return BigInt(0);
    const sizes =
      mode === 'archive' && files.length > 1
        ? [files.reduce((sum, file) => sum + file.buffer.byteLength, 0)]
        : files.map((file) => file.buffer.byteLength);
    return (await estimate(sizes)).totalUlume;
  };

  // The caller pays nothing on Solana: the gateway's Lumera key pays the LUME
  // fee, metered against the API key. The real cost is exposed through
  // `getUploadPriceUlume` / `estimate` rather than hidden behind a zero.
  const getUploadPrice = async (): Promise<SolAmount> => lamports(0);

  return {
    upload,
    uploadJson,
    getUploadPrice,
    estimate,
    getUploadPriceUlume,
  };
}
