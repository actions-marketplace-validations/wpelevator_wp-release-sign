import { getBooleanInput, getInput, setSecret } from '@actions/core';
import { SIGNING_KEY_ENV } from '@wpelevator/wp-release';

/**
 * Map the action inputs to the arguments of "wp-release sign". Files are
 * separated by new lines, since paths can contain commas.
 *
 * @return Arguments after the command name.
 */
export function getSignArgs(): string[] {
	const files = getInput( 'files' )
		.split( '\n' )
		.map( ( file ) => file.trim() )
		.filter( Boolean );
	const force = getInput( 'force' ) && getBooleanInput( 'force' );

	return [ ...files, ...( force ? [ '--force' ] : [] ) ];
}

/**
 * Read the signing key from the input, masking it in the logs, and make it
 * available to wp-release as the environment variable that it reads. The
 * input wins over a key that is already in the environment.
 */
export function exportSigningKey(): void {
	const key = getInput( 'signing-key' );

	if ( key ) {
		setSecret( key );
		process.env[ SIGNING_KEY_ENV ] = key;
	}
}
