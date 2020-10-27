import { SkynetClient } from "./client";
// import { Buffer } from "buffer";
import { pki } from "node-forge";
// import { readData } from "./utils";

const { publicKey, privateKey } = pki.ed25519.generateKeyPair();
const client = new SkynetClient("https://siasky.dev");

const datakey = "HelloWorld";
const json = { data: "thisistext" };

// skip - used to verify end-to-end flow
describe("siasky.dev end to end", () => {
  it("to update the file in the SkyDB", async () => {
    // set the file in the SkyDB
    const updated = await client.db.setJSON(privateKey, datakey, json);
    expect(updated).toBe(true);

    // get the file in the SkyDB
    const actual = await client.db.getJSON(publicKey, datakey);
    expect(actual.data).toEqual(json);

    // // assert the contents of that file
    // const text = await readData(actual.file);
    // const parts = text.toString().split(",");
    // expect(parts.length).toBe(2);
    // const buf = Buffer.from(parts[1], "base64");
    // expect(buf.toString("ascii")).toEqual("thisistext");
  });
});
