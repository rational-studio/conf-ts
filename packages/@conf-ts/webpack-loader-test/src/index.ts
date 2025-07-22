import config from './config.conf';

console.log(config);

document.getElementById('app').innerHTML = `
  <h1>Webpack Loader Test</h1>
  <pre>${JSON.stringify(config, null, 2)}</pre>
`;