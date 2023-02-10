/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
const jsonServer = require('json-server');

const server = jsonServer.create();
server.use(jsonServer.defaults({ bodyParser: true }));

server.post('/post', (req, res) => {
  res.status(201).json({ id: 42, userId: 142, name: req.body.name });
});

server.post('/post-multipart', (req, res) => {
  res.status(200).json({ from: 'multipart' });
});

server.get('/errors/404', (req, res) => {
  res.status(404).json({ message: 'Custom 404 error message' });
});

server.use(jsonServer.router('test/db.json'));
server.listen(3000, () => {
  console.log('Test server running at http://localhost:3000...');
});
