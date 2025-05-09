# ts-potrace Tests

This directory contains tests for the ts-potrace library. There are several test files with different approaches to testing the functionality.

## Test Files

- `potrace-real.test.ts` - Mocked tests for the Potrace class that cover the API surface without running potentially hanging code paths
- `final-potrace.test.ts` - Another set of mocked tests focusing on Potrace output generation
- `trace.test.ts` - Simple tests for parameter handling
- Other test files may hang or run indefinitely due to issues with bitmap processing

## Known Issues

There appears to be an issue with the `_bmToPathlist` method in the Potrace class that can cause tests to hang indefinitely. This is particularly likely to happen when processing real images or non-trivial bitmaps.

## Running Tests

To run only the tests that are known to work reliably:

```bash
bun test test/final-potrace.test.ts test/potrace-real.test.ts
```

To run all tests (warning: may hang):

```bash
bun test
```

## Debugging Notes

The main issue appears to be in:

1. The `_bmToPathlist` method which may enter an infinite loop with certain input patterns
2. Bitmap processing when dealing with real images through Jimp integration

The working tests mock these problematic methods to ensure test stability. If you need to debug the actual implementation issues, look at `debug-potrace.test.ts` which isolates the problem areas.

## Future Improvements

1. Fix the core bitmap processing algorithms to prevent infinite loops
2. Add timeouts to all test cases to prevent hanging
3. Improve integration with Jimp for more reliable image loading
