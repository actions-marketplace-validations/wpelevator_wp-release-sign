import { setOutput } from '@actions/core';
import {
	GitHubActionsWriter,
	Logger,
	execute,
	logError,
} from '@wpelevator/wp-release';
import { getSignArgs, exportSigningKey } from './inputs.ts';

const logger = new Logger( { writer: new GitHubActionsWriter() } );

try {
	exportSigningKey();

	const { result } = await execute( 'sign', getSignArgs(), {
		cwd: process.env.GITHUB_WORKSPACE || process.cwd(),
		logger,
	} );
	const { signatures, publicKey, formats, publicKeys } = result;

	setOutput( 'signatures', signatures.join( '\n' ) );
	setOutput( 'public-key', publicKey );
	setOutput( 'formats', formats );
	setOutput( 'public-keys', publicKeys );
} catch ( error ) {
	logError( logger, error, 'WP Release Sign' );
	process.exitCode = 1;
}
