import { pki } from "node-forge";
import { SkynetClient } from "./client";
import { RegistryEntry, SignedRegistryEntry } from "./registry";
import { trimUriPrefix, uriSkynetPrefix } from "./utils";

/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.timeout=5000] - Timeout in ms for the registry lookup.
 */
export async function getRegistry(
  this: SkynetClient,
  publicKey: string,
  dataKey: string,
  customOptions = {}
): Promise<{ data: string; revision: number } | null> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  // lookup the registry entry
  const entry: SignedRegistryEntry = await this.registry.getEntry(publicKey, dataKey, opts);
  if (entry === null) {
    return null;
  }

  return { data: entry.entry.data, revision: entry.entry.revision };
}

export async function setRegistry(
  this: SkynetClient,
  privateKey: string,
  dataKey: string,
  skylink: string,
  revision?: number,
  customOptions = {}
): Promise<void> {
  const opts = {
    ...this.customOptions,
    ...customOptions,
  };

  const privateKeyBuffer = Buffer.from(privateKey, "hex");

  // Upload the data to acquire its skylink
  // TODO: Replace with upload request method.

  if (!revision) {
    // fetch the current value to find out the revision.
    let entry: SignedRegistryEntry;
    try {
      const publicKey = pki.ed25519.publicKeyFromPrivateKey({ privateKey: privateKeyBuffer });
      entry = await this.registry.getEntry(publicKey, dataKey, opts);

      revision = entry.entry.revision + 1;
    } catch (err) {
      revision = 0;
    }
  }

  // build the registry value
  const entry: RegistryEntry = {
    datakey: dataKey,
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision,
  };

  // update the registry
  await this.registry.setEntry(privateKey, entry);
}
