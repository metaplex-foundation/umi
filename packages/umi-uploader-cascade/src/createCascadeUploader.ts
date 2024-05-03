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
import fetch from 'node-fetch';
const FormData = require('form-data');

const CASCADE_API_URL = 'https://gateway-api.pastel.network/';

export type CascadeUploaderOptions = {
  apiKey: string;
};

export type CascadeUploadedItem = {
  result_id: string;
  result_status: string;
  registration_ticket_txid: string | undefined;
  original_file_ipfs_link: string | undefined;
  error: string | undefined;
};

export type CascadeUploadResponse = {
  request_id: string;
  request_status: string;
  results: CascadeUploadedItem[];
};

export function createCascadeUploader(
  context: Pick<Context, 'rpc' | 'payer'>,
  options: CascadeUploaderOptions = { apiKey: '' }
): UploaderInterface & {
  upload2: (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ) => Promise<CascadeUploadedItem[]>;
} {
  const { apiKey } = options;

  if (!apiKey) {
    throw new Error('Cascade Gateway API key is required');
  }

  const getUploadPrice = async (): Promise<SolAmount> => lamports(0);

  const upload = async (files: GenericFile[]): Promise<string[]> => {
    const uris: string[] = [];

    const body = new FormData();

    files.forEach((file) => {
      body.append('files', Buffer.from(file.buffer), file.fileName);
    });

    try {
      const res = await fetch(
        `${CASCADE_API_URL}/api/v1/cascade?make_publicly_accessible=true`,
        {
          headers: {
            Api_key: apiKey,
          },
          method: 'POST',
          body: body,
        }
      );

      const data: CascadeUploadResponse = await res.json();
      data.results.forEach((item) => {
        if (item.original_file_ipfs_link)
          uris.push(item.original_file_ipfs_link);
        else {
          uris.push('');
        }
      });
    } catch (e) {
      return [];
    }
    console.log(uris);
    return uris;
  };

  const upload2 = async (
    files: GenericFile[]
  ): Promise<CascadeUploadedItem[]> => {
    const body = new FormData();

    files.forEach((file) => {
      body.append('files', Buffer.from(file.buffer), file.fileName);
    });

    try {
      const res = await fetch(
        `${CASCADE_API_URL}/api/v1/cascade?make_publicly_accessible=true`,
        {
          headers: {
            Api_key: apiKey,
          },
          method: 'POST',
          body,
        }
      );

      const data: CascadeUploadResponse = await res.json();

      return data.results;
    } catch (e) {
      return [];
    }
  };

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  return {
    getUploadPrice,
    upload,
    uploadJson,
    upload2,
  };
}
