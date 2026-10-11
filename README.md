# WP Release Sign

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-WP%20Release%20Sign-blue?logo=github)](https://github.com/marketplace/actions/wp-release-sign) [![Latest release](https://img.shields.io/github/v/release/wpelevator/wp-release-sign?include_prereleases&sort=semver)](https://github.com/wpelevator/wp-release-sign/releases) [![npm](https://img.shields.io/npm/v/@wpelevator/wp-release?label=wp-release)](https://www.npmjs.com/package/@wpelevator/wp-release)

GitHub Action that signs release files with Ed25519 using [`@wpelevator/wp-release`](https://www.npmjs.com/package/@wpelevator/wp-release). It's named after the [`wp-release sign`](https://www.npmjs.com/package/@wpelevator/wp-release#sign) command that it runs.

**Status:** first release (0.x). Signatures are checked against libsodium in the `wp-release` tests, but haven't been used for a real release yet.

It writes a detached `<file>.sig` next to each file: a base64 Ed25519 signature of the raw SHA-384 digest of the file, the format that WordPress core's `verify_file_signature()` checks. Sign both the ZIP and the checksums manifest: the ZIP signature covers installs and updates, and the manifest signature covers the contents after unpacking.

## Usage

```yaml
jobs:
  release:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7

      - id: zip
        uses: wpelevator/wp-release-zip@0.2.0
        with:
          checksums: true

      - id: sign
        uses: wpelevator/wp-release-sign@0.2.0
        with:
          files: |
            ${{ steps.zip.outputs.zip-path }}
            ${{ steps.zip.outputs.checksums-path }}
          signing-key: ${{ secrets.WP_RELEASE_SIGNING_KEY }}
```

Attach the ZIP, the manifest and the two `.sig` files to the release. Publish the `public-key` output wherever the signatures are checked, such as the `signing_key` of [update-client](https://github.com/wpelevator/update-client), and check a signed manifest with `wp-release verify --public-key`.

Sign the manifest after writing it and before zipping or deploying when it's shipped inside the plugin, because the signature covers the exact bytes of the file. See [Manifest inside the plugin](https://www.npmjs.com/package/@wpelevator/wp-release#manifest-inside-the-plugin).

## Inputs

| Input | Default | Description |
|---|---|---|
| `files` | | Files to sign, one per line. Relative paths resolve from the repository root. Required. |
| `signing-key` | `WP_RELEASE_SIGNING_KEY` env var | Base64 32-byte Ed25519 seed or 64-byte libsodium secret key. Pass it from a secret; it's masked in the logs and never printed. |
| `force` | `false` | Overwrite existing `.sig` files. |

## Outputs

| Output | Description |
|---|---|
| `signatures` | Paths of the written `.sig` files, one per line. |
| `public-key` | Base64 public key of the signing key. |

## Job summary

Each run adds a section to the job summary of the run with the signature files and the public key, so it can be copied to where the signatures are checked. A failed run adds its error instead, and the run fails. The paths are relative to the workspace.

## Without the action

When you can't use a GitHub Action, such as on another CI system or in a local release script, add the same tooling as a development dependency and run the CLI command that the action runs, passing the key in the `WP_RELEASE_SIGNING_KEY` environment variable from your CI secrets:

```bash
npm install --save-dev @wpelevator/wp-release
npx wp-release sign my-plugin.1.0.0.zip my-plugin.1.0.0.checksums.json
```

The files are the arguments of [`wp-release sign`](https://www.npmjs.com/package/@wpelevator/wp-release#sign) and `force` is `--force`. There's no flag for the signing key, since it would show in the process list. Add `--verbose` to print the public key, which the action returns as the `public-key` output, or `--json` for the paths of the signatures. The CLI needs Node.js 22.12 or later, and has no other dependencies on the runner. Run `npx wp-release sign --help` for all options.

## How it works

[`src/run.ts`](src/run.ts) reads the inputs with [`@actions/core`](https://github.com/actions/toolkit/tree/main/packages/core), maps them to the arguments of the [`wp-release sign`](https://www.npmjs.com/package/@wpelevator/wp-release#sign) command and runs it through the `execute()` function of [`@wpelevator/wp-release`](https://www.npmjs.com/package/@wpelevator/wp-release), so the action and the CLI always behave the same. The action runs `dist/index.js`, a single file bundled with esbuild that includes `wp-release` and all other dependencies, so nothing is installed from npm when the action runs. The tooling version is fixed by the action ref you pin.

## Development

The source is TypeScript in `src/`. `dist/` is git-ignored in the monorepo. `npm run build` bundles the published `wp-release` version declared by this action; update that dependency after the new `wp-release` version is published. The split-push workflow commits the bundle to the action's release repository. `npm test` runs the input mapping tests with Node.js type stripping, and `npm run lint` runs ESLint and a `tsc` type check.

```bash
npm run build --workspace @wpelevator/wp-release-sign-action
```
