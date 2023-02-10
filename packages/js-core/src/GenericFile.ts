import { generateRandomString, utf8 } from './utils';

export type GenericFile = {
  readonly buffer: Uint8Array;
  readonly fileName: string;
  readonly displayName: string;
  readonly uniqueName: string;
  readonly contentType: string | null;
  readonly extension: string | null;
  readonly tags: GenericFileTag[];
};

export type GenericFileTag = { name: string; value: string };
export type BrowserFile = File;
export type GenericFileOptions = {
  displayName?: string;
  uniqueName?: string;
  contentType?: string;
  extension?: string;
  tags?: { name: string; value: string }[];
};

export const createGenericFile = (
  content: string | Uint8Array,
  fileName: string,
  options: GenericFileOptions = {}
): GenericFile => ({
  buffer: typeof content === 'string' ? utf8.serialize(content) : content,
  fileName,
  displayName: options.displayName ?? fileName,
  uniqueName: options.uniqueName ?? generateRandomString(),
  contentType: options.contentType ?? null,
  extension: options.extension ?? getExtension(fileName),
  tags: options.tags ?? [],
});

export const createGenericFileFromBrowserFile = async (
  browserFile: BrowserFile,
  options: GenericFileOptions = {}
): Promise<GenericFile> =>
  createGenericFile(
    new Uint8Array(await browserFile.arrayBuffer()),
    browserFile.name,
    options
  );

export const createGenericFileFromJson = <T>(
  json: T,
  fileName = 'inline.json',
  options: GenericFileOptions = {}
): GenericFile => createGenericFile(JSON.stringify(json), fileName, options);

export const createBrowserFileFromGenericFile = (
  file: GenericFile
): BrowserFile => new File([file.buffer as BlobPart], file.fileName);

export const parseJsonFromGenericFile = <T>(file: GenericFile): T =>
  JSON.parse(new TextDecoder().decode(file.buffer));

export const getBytesFromGenericFiles = (...files: GenericFile[]): number =>
  files.reduce((acc, file) => acc + file.buffer.byteLength, 0);

export const isGenericFile = (file: any): file is GenericFile =>
  file != null &&
  typeof file === 'object' &&
  'buffer' in file &&
  'fileName' in file &&
  'displayName' in file &&
  'uniqueName' in file &&
  'contentType' in file &&
  'extension' in file &&
  'tags' in file;

const getExtension = (fileName: string): string | null => {
  const lastDotIndex = fileName.lastIndexOf('.');

  return lastDotIndex < 0 ? null : fileName.slice(lastDotIndex + 1);
};
