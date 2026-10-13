import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	generateSigningKeyPair,
	getSignaturePath,
	parsePublicKey,
	verifyFileSignature,
} from '@wpelevator/wp-release';
import type { SignatureFormat } from '@wpelevator/wp-release';
import { withEnv } from './test-env.ts';

/**
 * Read an output written by @actions/core, including multiline values.
 *
 * @param path GitHub output file.
 * @param name Output name.
 * @return Output value.
 */
function readOutput( path: string, name: string ): string {
	const match = readFileSync( path, 'utf8' ).match(
		new RegExp( `^${ name }<<([^\\n]+)\\n([\\s\\S]*?)\\n\\1$`, 'm' )
	);

	assert.ok( match, `The action should set the ${ name } output.` );

	return match[ 2 ] ?? '';
}

test( 'writes selected signatures and exposes public keys for each format', async ( t ) => {
	const cwd = mkdtempSync( join( tmpdir(), 'wp-release-sign-action-' ) );
	const file = join( cwd, 'release file.zip' );
	const output = join( cwd, 'outputs' );
	const keys = generateSigningKeyPair();

	t.after( () => rmSync( cwd, { recursive: true, force: true } ) );
	writeFileSync( file, 'release contents' );
	writeFileSync( output, '' );
	const result = withEnv(
		{
			GITHUB_WORKSPACE: cwd,
			GITHUB_OUTPUT: output,
			INPUT_FILES: 'release file.zip',
			INPUT_FORMAT: 'wordpress,minisign,ssh',
			'INPUT_SIGNING-KEY': keys.privateKey,
		},
		() =>
			spawnSync(
				process.execPath,
				[ fileURLToPath( new URL( './run.ts', import.meta.url ) ) ],
				{ cwd, env: process.env, encoding: 'utf8' }
			)
	);

	assert.equal( result.status, 0, result.stdout + result.stderr );
	assert.equal(
		readOutput( output, 'signatures' ),
		`${ file }.sig\n${ file }.minisig\n${ file }.sshsig`,
		'The existing signatures output should list every selected format.'
	);
	assert.equal(
		readOutput( output, 'public-key' ),
		keys.publicKey,
		'The existing public-key output should remain a base64 key.'
	);
	const formats: SignatureFormat[] = [ 'wordpress', 'minisign', 'ssh' ];

	assert.deepEqual(
		JSON.parse( readOutput( output, 'formats' ) ),
		formats,
		'The formats output should be a JSON array.'
	);
	assert.deepEqual(
		JSON.parse( readOutput( output, 'public-keys' ) ),
		keys.publicKeys,
		'The public-keys output should expose all public key forms as JSON.'
	);
	for ( const format of formats ) {
		assert.ok(
			await verifyFileSignature(
				file,
				getSignaturePath( file, format ),
				parsePublicKey( keys.publicKeys[ format ] ),
				format
			),
			'Each format should verify with its exported public key.'
		);
	}
} );
