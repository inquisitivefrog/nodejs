const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Hello World Application', () => {
  const scriptPath = path.join(__dirname, 'helloworld.js');

  test('helloworld.js file exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('executes and outputs "Hello, World!"', () => {
    const output = execSync(`node ${scriptPath}`, { encoding: 'utf-8' });
    expect(output.trim()).toBe('Hello, World!');
  });

  test('script runs without errors', () => {
    expect(() => {
      execSync(`node ${scriptPath}`, { encoding: 'utf-8' });
    }).not.toThrow();
  });
});

