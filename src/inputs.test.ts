import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNING_KEY_ENV } from '@wpelevator/wp-release';
import { getSignArgs, exportSigningKey } from './inputs.ts';
import { withEnv } from './test-env.ts';

test( 'reads one file per line', () => {
	assert.deepEqual(
		withEnv(
			{ INPUT_FILES: 'a.zip\n  b,c.json  \n\n', INPUT_FORCE: 'true' },
			getSignArgs
		),
		[ 'a.zip', 'b,c.json', '--force' ],
		'Files should be trimmed, split on new lines only and followed by --force.'
	);
} );

test( 'passes the signing key to wp-release through the environment', () => {
	const original = process.env[ SIGNING_KEY_ENV ];

	try {
		process.env[ SIGNING_KEY_ENV ] = 'from-env';
		withEnv( {}, exportSigningKey );
		// withEnv restores the whole environment, so check inside a callback.
		const key = withEnv( { 'INPUT_SIGNING-KEY': 'from-input' }, () => {
			exportSigningKey();

			return process.env[ SIGNING_KEY_ENV ];
		} );

		assert.equal(
			key,
			'from-input',
			'The signing-key input should win over the environment variable.'
		);
	} finally {
		if ( undefined === original ) {
			delete process.env[ SIGNING_KEY_ENV ];
		} else {
			process.env[ SIGNING_KEY_ENV ] = original;
		}
	}
} );
