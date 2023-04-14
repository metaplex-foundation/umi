import test from 'ava';
import { HttpResponse, request } from '@metaplex-foundation/umi';
import { createFetchHttp } from '../src';

const BASE_URL = 'http://localhost:3000';

type User = {
  id: number;
  userId: number;
  name: string;
};

test('it can send a JSON get request', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<User>(
    request().get(`${BASE_URL}/users/1`).asJson()
  );
  t.like(response, <HttpResponse<User>>{
    data: {
      id: 1,
      userId: 101,
      name: 'Alice',
    },
    ok: true,
    status: 200,
    statusText: 'OK',
  });
});

test('it can handle JSON errors', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<User>(
    request().get(`${BASE_URL}/errors/404`).asJson()
  );
  t.like(response, <HttpResponse>{
    data: { message: 'Custom 404 error message' },
    ok: false,
    status: 404,
    statusText: 'Not Found',
  });
});

test('it can send a JSON post request', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<User>(
    request()
      .post(`${BASE_URL}/post`)
      .withData<{ name: string }>({ name: 'Loris' })
      .asJson()
  );
  t.like(response, <HttpResponse<User>>{
    data: {
      id: 42,
      userId: 142,
      name: 'Loris',
    },
    ok: true,
    status: 201,
    statusText: 'Created',
  });
});

// FormData unavailable in Node.js 16.
test.skip('it can send a Multipart post request', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<User>(
    request()
      .post(`${BASE_URL}/post-multipart`)
      .withData(new FormData())
      .asMultipart()
  );
  t.like(response, <HttpResponse>{
    data: { from: 'multipart' },
    ok: true,
    status: 200,
    statusText: 'OK',
  });
});
