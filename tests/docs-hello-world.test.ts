import { describe, it, expect } from 'vitest';
const { sayHello } = require('../docs/hello-world.js');

describe('Docs Hello World', () => {
  it('returns expected greeting', () => {
    expect(sayHello()).toBe('Hello, AgentStack!');
  });
});
