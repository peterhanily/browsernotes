import { describe, it, expect } from 'vitest';
import {
  resolveVariables,
  evaluateCondition,
  resolveDeep,
} from '../lib/integration-expression';

// ---------------------------------------------------------------------------
// Shared context fixture
// ---------------------------------------------------------------------------

const ctx: Record<string, unknown> = {
  ioc: { id: 'ioc1', value: '1.2.3.4', type: 'ipv4', confidence: 'high' },
  investigation: { id: 'folder1', name: 'APT29 Investigation' },
  config: { apiKey: 'test-key-123' },
  steps: {
    fetch: {
      response: {
        status: 200,
        data: {
          country: 'US',
          score: 75,
          name: 'evil.example.com',
          tags: ['malware', 'c2'],
        },
      },
    },
  },
  vars: { a: '1', b: '2' },
  items: [{ name: 'first' }, { name: 'second' }],
};

// ---------------------------------------------------------------------------
// resolveVariables
// ---------------------------------------------------------------------------

describe('resolveVariables', () => {
  it('resolves a simple path', () => {
    expect(resolveVariables('{{ioc.value}}', ctx)).toBe('1.2.3.4');
  });

  it('resolves a nested path', () => {
    expect(
      resolveVariables('{{steps.fetch.response.data.country}}', ctx),
    ).toBe('US');
  });

  it('returns empty string for a missing path', () => {
    expect(resolveVariables('{{no.such.path}}', ctx)).toBe('');
  });

  it('stringifies objects', () => {
    const result = resolveVariables('{{steps.fetch.response.data}}', ctx);
    expect(result).toBe(
      JSON.stringify({
        country: 'US',
        score: 75,
        name: 'evil.example.com',
        tags: ['malware', 'c2'],
      }),
    );
  });

  it('stringifies arrays', () => {
    const result = resolveVariables(
      '{{steps.fetch.response.data.tags}}',
      ctx,
    );
    expect(result).toBe(JSON.stringify(['malware', 'c2']));
  });

  it('handles multiple tokens in one string', () => {
    const result = resolveVariables(
      'IOC {{ioc.value}} is type {{ioc.type}}',
      ctx,
    );
    expect(result).toBe('IOC 1.2.3.4 is type ipv4');
  });

  it('handles numeric array access', () => {
    expect(resolveVariables('{{items.0.name}}', ctx)).toBe('first');
    expect(resolveVariables('{{items.1.name}}', ctx)).toBe('second');
  });

  it('leaves non-template text unchanged', () => {
    expect(resolveVariables('plain text', ctx)).toBe('plain text');
  });

  it('handles empty template string', () => {
    expect(resolveVariables('', ctx)).toBe('');
  });

  it('handles null/undefined values in context', () => {
    const ctxWithNulls: Record<string, unknown> = {
      a: null,
      b: { nested: undefined },
    };
    expect(resolveVariables('{{a}}', ctxWithNulls)).toBe('');
    expect(resolveVariables('{{b.nested}}', ctxWithNulls)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
  it('== comparison returns true when equal', () => {
    expect(evaluateCondition('{{ioc.type}} == ipv4', ctx)).toBe(true);
  });

  it('!= comparison returns true when not equal', () => {
    expect(evaluateCondition('{{ioc.type}} != domain', ctx)).toBe(true);
  });

  it('> numeric comparison', () => {
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} > 50', ctx),
    ).toBe(true);
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} > 100', ctx),
    ).toBe(false);
  });

  it('>= numeric comparison', () => {
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} >= 75', ctx),
    ).toBe(true);
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} >= 76', ctx),
    ).toBe(false);
  });

  it('< numeric comparison', () => {
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} < 100', ctx),
    ).toBe(true);
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} < 50', ctx),
    ).toBe(false);
  });

  it('<= numeric comparison', () => {
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} <= 75', ctx),
    ).toBe(true);
    expect(
      evaluateCondition('{{steps.fetch.response.data.score}} <= 74', ctx),
    ).toBe(false);
  });

  it('exists operator returns true for present path', () => {
    expect(evaluateCondition('{{ioc.value}} exists', ctx)).toBe(true);
  });

  it('not-exists operator returns true for missing path', () => {
    expect(evaluateCondition('{{missing.path}} not-exists', ctx)).toBe(true);
  });

  it('contains operator', () => {
    expect(
      evaluateCondition(
        '{{steps.fetch.response.data.name}} contains evil',
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        '{{steps.fetch.response.data.name}} contains benign',
        ctx,
      ),
    ).toBe(false);
  });

  it('startsWith operator', () => {
    expect(
      evaluateCondition(
        '{{steps.fetch.response.data.name}} startsWith evil',
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        '{{steps.fetch.response.data.name}} startsWith example',
        ctx,
      ),
    ).toBe(false);
  });

  it('endsWith operator', () => {
    expect(
      evaluateCondition(
        '{{steps.fetch.response.data.name}} endsWith .com',
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        '{{steps.fetch.response.data.name}} endsWith .org',
        ctx,
      ),
    ).toBe(false);
  });

  it('and combinator — both conditions true', () => {
    expect(
      evaluateCondition('{{vars.a}} == 1 and {{vars.b}} == 2', ctx),
    ).toBe(true);
  });

  it('and combinator — one condition false', () => {
    expect(
      evaluateCondition('{{vars.a}} == 1 and {{vars.b}} == 999', ctx),
    ).toBe(false);
  });

  it('or combinator — one condition true', () => {
    expect(
      evaluateCondition('{{vars.a}} == 1 or {{vars.b}} == 999', ctx),
    ).toBe(true);
  });

  it('or combinator — both conditions false', () => {
    expect(
      evaluateCondition('{{vars.a}} == 999 or {{vars.b}} == 999', ctx),
    ).toBe(false);
  });

  it('returns false for always-false expression', () => {
    expect(evaluateCondition('{{ioc.type}} == domain', ctx)).toBe(false);
  });

  it('empty/truthy expression with no operator', () => {
    // A resolved non-empty string with no operator is truthy
    expect(evaluateCondition('{{ioc.value}}', ctx)).toBe(true);
    // A missing path resolves to empty string which is falsy
    expect(evaluateCondition('{{no.such.path}}', ctx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveDeep
// ---------------------------------------------------------------------------

describe('resolveDeep', () => {
  it('resolves strings in a flat object', () => {
    const input = {
      url: 'https://api.example.com/lookup/{{ioc.value}}',
      key: '{{config.apiKey}}',
    };
    expect(resolveDeep(input, ctx)).toEqual({
      url: 'https://api.example.com/lookup/1.2.3.4',
      key: 'test-key-123',
    });
  });

  it('resolves strings in a nested object', () => {
    const input = {
      request: {
        headers: { Authorization: 'Bearer {{config.apiKey}}' },
        params: { ip: '{{ioc.value}}' },
      },
    };
    expect(resolveDeep(input, ctx)).toEqual({
      request: {
        headers: { Authorization: 'Bearer test-key-123' },
        params: { ip: '1.2.3.4' },
      },
    });
  });

  it('resolves strings in arrays', () => {
    const input = ['{{ioc.value}}', '{{ioc.type}}', 'literal'];
    expect(resolveDeep(input, ctx)).toEqual(['1.2.3.4', 'ipv4', 'literal']);
  });

  it('passes through numbers and booleans unchanged', () => {
    const input = { count: 42, enabled: true, label: '{{ioc.type}}' };
    expect(resolveDeep(input, ctx)).toEqual({
      count: 42,
      enabled: true,
      label: 'ipv4',
    });
  });

  it('handles null and undefined', () => {
    expect(resolveDeep(null, ctx)).toBeNull();
    expect(resolveDeep(undefined, ctx)).toBeUndefined();
  });

  it('handles deep nested mixed structures', () => {
    const input = {
      steps: [
        {
          name: 'Lookup {{ioc.value}}',
          config: {
            url: 'https://api.example.com/{{ioc.type}}/{{ioc.value}}',
            retries: 3,
            active: true,
            tags: ['{{ioc.confidence}}', 'automated'],
          },
        },
      ],
      metadata: null,
    };
    expect(resolveDeep(input, ctx)).toEqual({
      steps: [
        {
          name: 'Lookup 1.2.3.4',
          config: {
            url: 'https://api.example.com/ipv4/1.2.3.4',
            retries: 3,
            active: true,
            tags: ['high', 'automated'],
          },
        },
      ],
      metadata: null,
    });
  });
});
