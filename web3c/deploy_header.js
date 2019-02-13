const bytes = require('./bytes');
const assert = require('assert');

class DeployHeader {

  /**
   * @param {Number} version is the header version number.
   * @param {Object} is the header body with two fields, expiry (Number)
   *        and confidential (boolean).
   */
  constructor(version, body) {
	this.version = version;
	this.body = body;
  }

  data() {
	let version = bytes.toHex(bytes.parseNumber(this.version, DeployHeaderHexReader.versionLength()/2));
	let body = JSON.stringify(this.body);
	let length = bytes.toHex(bytes.parseNumber(body.length, 2));
	return '0x' + DeployHeader.prefix() + version.substr(2) + length.substr(2) + body;
  }

  /**
   * @param   {Object} headerBody is the header object to encode.
   * @param   {String} deploycode is a hex string of the current code to which we
   *          want to prefix the header.
   * @returns The deploycode with the header prefixed as the encoded wire format,
   *          i.e., version (2 bytes little endian) || length (2 bytes little endian) || json-header,
   *          override any header that may already exist in the deploycode.
   */
  static write(headerBody, deploycode) {
	if (!deploycode.startsWith('0x') || !headerBody) {
	  throw Error('Malformed deploycode or header');
	}
	let header = DeployHeader.read(deploycode);
	let initcode = DeployHeaderHexReader.initcode(deploycode);
	if (header == null) {
	  header = new DeployHeader(DeployHeader.currentVersion(), {});
	}

	if (headerBody) {
	  Object.assign(header.body, headerBody);
	}

	return header.data() + initcode;
  }

  /**
   * @param   {String} deploycode is the transaction data to deploy a contract as a hex string.
   * @returns the contract deploy header prefixed to the deploycode, otherwise, null.
   */
  static read(deploycode) {
	if (!deploycode.startsWith(DeployHeader.prefix())) {
	  return null;
	}
	let version = DeployHeaderHexReader.version(deploycode);
	let body = DeployHeaderHexReader.body(deploycode);

	return new DeployHeader(version, body);
  }

  /**
   * Returns the current version of the header.
   */
  static currentVersion() {
	return 1;
  }

  /**
   * Hex representation of b'\0sis'.
   */
  static prefix() {
	return '00736973';
  }
}

/**
 * A collection of utilities for parsing through deploycode including the Oasis contract
 * deploy header in the form of a hex string.
 */
class DeployHeaderHexReader {
  /**
   * @param {String} deploycode is a hex string of the header || initcode.
   * @assumes deploycode has the OASIS_PREFIX.
   */
  static body(deploycode) {
	assert.equal(true, deploycode.startsWith('0x'));

	let length = DeployHeader.parseLength(deploycode);
	let start = 2 + DeployHeader.versionLength*2 + DeployHeader.headerSizeLength()*2;

	let body = versionBody.substr(start, length*2);

	return body;
  }

  /**
   * @param {String} deploycode is a hex string of the header || initcode.
   * @assumes deploycode has the OASIS_PREFIX.
   */
  static length(deploycode)  {
	assert.equal(true, deploycode.startsWith('0x'));

	let length = deploycode.substr(
	  DeployHeaderHexReader.sizeStart(),
	  DeployHeaderHexReader.sizeLength()
	);

	return parseInt('0x' + length);
  }

  /**
   * @param {String} deploycode is a hex string of the header || initcode.
   * @assumes deploycode has the OASIS_PREFIX.
   */
  static version(deploycode) {
	assert.equal(true, deploycode.startsWith('0x'));

	let version = deploycode.substr(
	  DeployHeaderHexReader.versionStart(),
	  DeployHeaderHexReader.versionLength()
	);

	return parseInt('0x' + version);
  }

  /**
   * @param {String} deploycode is a hex string of the header || initcode.
   */
  static initcode(deploycode) {
	assert.equal(true, deploycode.startsWith('0x'));
	// If there's an oasis header then parse it to get the initcode.
	if (deploycode.startsWith('0x' + DeployHeader.prefix())) {
	  let initcode = deploycode.substr(
		DeployHeaderHexReader.initcodeStart(deploycode)
	  );
	  return initcode;
	}
	// No header so just strip off '0x'.
	return deploycode.substr(2);
  }

  static initcodeStart(deploycode) {
	assert.equal(true, deploycode.startsWith('0x'));

	return DeployHeaderHexReader.bodyStart() + DeployHeaderHexReader.length(deploycode);
  }

  /**
   * @returns the hex string index of the start section.
   */
  static versionStart() {
	return 2 + DeployHeader.prefix().length;
  }

  /**
   * @returns the length of the version in nibbles.
   */
  static versionLength() {
	return 2*2;
  }

  /**
   * @returns the length, in nibbles, of the size section.
   */
  static sizeStart() {
	return DeployHeaderHexReader.versionStart() + DeployHeaderHexReader.versionLength();
  }

  /**
   * @returns the length of the header size in nibbles.
   */
  static sizeLength() {
	return 2*2;
  }

  /**
   * @returns the hex string index of the body section.
   */
  static bodyStart() {
	return DeployHeaderHexReader.sizeStart() + DeployHeaderHexReader.sizeLength();
  }
}

module.exports = DeployHeader;
