import { setFailed, setOutput } from '@actions/core';
import { Logger, execute } from '@wpelevator/wp-release';
import { getSignArgs, exportSigningKey } from './inputs.ts';

const logger = new Logger( { ci: true } );

try {
	exportSigningKey();

	const { result } = await execute( 'sign', getSignArgs(), {
		cwd: process.env.GITHUB_WORKSPACE || process.cwd(),
		logger,
	} );
	const { signatures, publicKey } = result;

	setOutput( 'signatures', signatures.join( '\n' ) );
	setOutput( 'public-key', publicKey );
} catch ( error ) {
	setFailed( error instanceof Error ? error.message : String( error ) );
}
