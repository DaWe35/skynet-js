import { pki } from "node-forge";
import { SkynetClient } from "./client";
import { HashRegistryEntry, PublicKey, SecretKey } from "./crypto";
import { RegistryEntry, SignedRegistryEntry } from "./registry";
import { parseSkylink, promiseTimeout, trimUriPrefix, uriSkynetPrefix } from "./utils";

export async function getJSON(
  this: SkynetClient,
  publicKey: PublicKey,
  dataKey: string
): Promise<{ data: Record<string, unknown>; revision: number } | null> {
  // lookup the registry entry
  const entry: SignedRegistryEntry = await this.registry.getEntry(publicKey, dataKey);
  if (entry === null) {
    return null;
  }

  // Download the data in that Skylink
  // TODO: Replace with download request method.
  const skylink = parseSkylink(entry.entry.data);

  const response = await this.executeRequest({
    ...this.customOptions,
    method: "get",
    url: this.getSkylinkUrl(skylink),
  });

  return { data: response.data, revision: entry.entry.revision };
}

export async function setJSON(
  this: SkynetClient,
  privateKey: SecretKey,
  dataKey: string,
  json: Record<string, unknown>,
  revision?: number
): Promise<boolean> {
  // Upload the data to acquire its skylink
  // TODO: Replace with upload request method.
  const file = new File([JSON.stringify(json)], dataKey, { type: "text/plain" });
  const { skylink } = await this.uploadFileRequest(file, this.customOptions);

  const publicKey = pki.ed25519.publicKeyFromPrivateKey({ privateKey });

  console.log("skylink after upload", skylink)
  if (!revision) {
    // fetch the current value to find out the revision.
    let entry;
    try {
      entry = await promiseTimeout(this.registry.getEntry(publicKey, dataKey), 5000);
    } catch (err) {}

    // const entry = await this.registry.getEntry(publicKey, dataKey);
    if (entry) {
      // verify here
      if (
        !pki.ed25519.verify({
          message: HashRegistryEntry(entry.entry),
          signature: entry.signature,
          publicKey,
        })
      ) {
        throw new Error("could not verify signature");
      }

      revision = entry.revision + 1;
    } else {
      revision = 0;
    }
  }

  // build the registry value
  const entry: RegistryEntry = {
    datakey: dataKey,
    data: trimUriPrefix(skylink, uriSkynetPrefix),
    revision,
  };

  // sign it
  const signature = pki.ed25519.sign({
    message: HashRegistryEntry(entry),
    privateKey,
  });

  // update the registry
  return this.registry.setEntry(publicKey, dataKey, entry, signature);
}
