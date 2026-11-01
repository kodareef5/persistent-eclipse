// Copy lab helpers in both adapters. A known, untouched release can be upgraded;
// an unknown or edited copy belongs to the lab and gets a comparison candidate.
const fs = require("node:fs");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const sha = (body) => createHash("sha256").update(body).digest("hex");

// Filled from trusted main history through 2f1e99c. This bootstraps labs that
// predate shipment tracking; subsequent releases use the clone-local manifest.
const legacy = {
  "lint-notes.mjs": [
    "2a5e2ae257e19d58f3d06b7bf2f25287e76531cba5c394f5c9656c460e212c1e",
    "3a84dc868971abad0ac920c5b477fb9cf8978ec1a0d2748716357e39f83b5bb1",
    "61a9ae5a2e895ce0dcdbe0958ccee99438401d0e14f1fa9bebb443410847ff29",
    "76cd98319a4355048b0ac01aa5e367e2a7ef97b2fd3fb3966ab6bcc179d3cd12",
    "92eb083a365a47f432ef666e4611906cb1706366dceb7f5df007ff74f91ca841",
    "abf00e6fbb91dd4edf16772857b6b968cd6b8b7c5ef1c6660c35558f69763d3d",
    "d0bdcce493db7aedfad2768096ab8f7215011e400d9197aa5f4e7de65d93fab2",
    "d0c86eeacd581315f183666297e0bfb49bb2847014d50d277f8dad8d6b2958b5",
    "d2172b35cc35c895c6e507d4287e9ffd2ed1a5ae338e892d75ebffd101418fc9",
    "d288e9e1e490aed9219bcb9e642cd86993470630d1e6b157db8c20407b74bb87",
    "f1cac35f51665ab9c18098553f15669ce64e27c2885310724dce98e64482d535",
    "f5aa65187776d7801036a020c3671860207c7437e3b6c1b85d5dffcb7e5f64fb",
    "ff415bfe6355188e76f98fb292deba769796afe72aeddf1c9ad677231e095b8a"
  ],
  "cvss.mjs": [
    "03f605477fceca2bd77b1a01f0ed87ab9789c5960c69e3d9f921e9c9d7858db0",
    "d14765428f08ea26a9d0ca17d86dce0c52c62796e259aa1fa2815501050b6d52"
  ],
  "pack.mjs": [
    "500423e8970267cf3f2240f38d9310445c010488d982bd74cbd086748f8e8ce7",
    "8bbc2814e9ecd1330c01493cb3675efc8c07d5b378f5c979045e7471cc715395",
    "ca3150674e481ff6a6b5537135ac6caf3968c48eae45c3f34aa1c4c5eb560e0a"
  ],
  "history.mjs": [
    "0b5d9de4018c4a2f125712504dacbc32a869e87e00d35d7f86c9701ca5a68a56",
    "0faf99c86a107d83d1b97b8e90d6179c289a567108709294339d8eb8a9000d5f",
    "17e6da5edf928a8224832e2123646d66284a778931ad10fecc4f2d171e3b8b3e",
    "38e294570474e8f2d5610c0c97d0ac0bfefa233b74a13a3aa9651ca43f19739a",
    "65ad8084da5fbbdb16e09093db81ffcc3870910fd9fd8d65fd4a66456338ffd0",
    "9ef92438b4a0fd46c3640f854e418682f217b9559918aa98f4486beab8f4e6db",
    "aad31c607fa2fb403ce136336483d0a8d87dc455250bfb9781e88185ffa3ffa0",
    "d66f7385f0641455a8690525f47aab6393654ab1d6430bdded88132af5a410c0",
    "e2effe60ee188f0b1216b472725e948c9954e0a40887820a85504201c3289ebb"
  ],
  "activity.mjs": [
    "e71c2be8dcecafbe1545021aa9ba76c4fd7519bd3be16e9dee143e6ea61893b3"
  ],
  "status-report.mjs": [
    "1e06eff1a8e95b0b50946dce68aaac69932620a57a03390c807620fc0afacde1",
    "3ddb7998841cb62f05e159c9cc9f322bc5e55741d5c97dffe31790a0afd380ba",
    "a53f487e53240b8608c91cd8c5daa51c638595969a177a74278f24df0bf69663"
  ],
  "ledger.mjs": [
    "4f798ecc29a5c1880948f6134d9d361bb8686fbbecf5e4e8eb5c9534d8ba63d7",
    "6749a09e49534961989155d383407cd01cc8705dc4a4e160580f847abf614a84"
  ],
  "content.cjs": [
    "0f9691ab771ac5fc1e4b389188fd0477a0627a740de183dbe777c829fb6b4735",
    "902979146a6350d605bd343be502d596682b9e294c7d20f75c05b8091530f42d",
    "ba25d9d600febe2f5fc89338fe335cc8267d3894746ccf0f44091b787f178c4a",
    "bd5e9d1adb18dc3acc322890a047b5db6b07beac0d13f2b2af8de4a4192860ed",
    "c9d41ec243043d13eca1865d41f44ad97365353c9723ee150ca377d1b605a072",
    "cd041d04b168cc138eedc7260664d85ef80eb884ed024c374d824c152cf21150",
    "cf1a013079d25c2708e0ac59517e33c4fb3708e84725694a3ac14142eaac7788",
    "fec9585d4f044e2eddece1011ca63fb48168df38ec255eedf80d8167041ef120"
  ],
  "questions.cjs": [
    "4f8a17a168f4d20f3b65b4c91f529974fa11a3191b2ccad3a19f73da4c98334a",
    "87d6f867c0553f5d69fbb251abbb3ef538ed311fb074535f6f9a0c9d560c2c5c"
  ],
  "record.cjs": [
    "1a86193c1f09d9169dfd1a40321e239e2778502134428af09028ade3e368b5ae",
    "1c99c6b4ceac267b9a7d622810ee1f8fd21a7aead681d59706a33248102b81ad",
    "40df5238c51c121a119ef3af845842bdbf9b39a1df0a4cdac2619db8b1b578d6",
    "7cc9f507bc8d8594fe32f783590d3137f099514b58e1a937206fe1e43a4b5202"
  ],
  "sync.mjs": [
    "080c069162c0762afa5b14868771d319dabb4f5ae7bd93b63a14cd339b53624a",
    "409238abd19adf9dfc8a3a59a2ccdfa0a4634378d85d5a0bfd866fcb86d679a8",
    "4abcd6e23208e23bbc5a4ffb5cf1da80f5a148b01b54547ba9e03d91401bee77",
    "6965128a0f951d1f0b76c4af8f7c947e9f6a34cf1eb74080639b812862b838c4",
    "a1a6422dcc4e1700acb83411d7247766cc084296e7f72c5273561a5d4aa5bca6",
    "cbaed088460a4b49130c1ae1b837ca529772b41adda5d3ae4e2ed5bde77ead3c",
    "ce3964e3430c5517b011890b32b4f1f8d31639c914f52c7909ba7e1836a93d64",
    "d6311f66be193bdf296a28940bc099873e296c2c85c266755aface8a21ab0d88"
  ],
  "pack-defaults.json": [
    "7e89f5a1522c1da6f7d81547171721442b8ffa286daccb122efa68c1c0221cb8",
    "8c32bc0f26fd41a3d226a4062431777581de6ff5b746c3782a44efc69785f284",
    "e60b9ff7af206e82fdc3afa3774a414a34f19f216c4f7e875c420d27d0c8b68f"
  ],
  "push-check.mjs": [
    "0f139896dc26620258cb325ef192cb8e85285014dc0dd6ed89cf8b3fff1921cd",
    "52df0f485b1aab5a843bacd7790f3bdb4007cd0a71baf127bdc0909e0147d43a"
  ]
};

function write(file, body) {
  const temp = file + "." + randomUUID();
  try {
    fs.writeFileSync(temp, body);
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

function place(lab, shipped) {
  const dir = path.join(lab, ".research/tools");
  const local = path.join(lab, ".research/local");
  const manifest = path.join(local, "shipped-tools.json");
  const result = { upgraded: [], customized: [], errors: [] };
  let previous = {};
  try {
    const saved = JSON.parse(fs.readFileSync(manifest, "utf8"));
    if (saved.format === 1) previous = saved.tools || {};
  } catch { /* Older labs have no shipment record. */ }
  const hashes = { ...previous };
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(local, { recursive: true });
    if (!fs.existsSync(path.join(local, ".gitignore")))
      fs.writeFileSync(path.join(local, ".gitignore"), "*\n", { flag: "wx" });
    for (const [name, body] of Object.entries(shipped)) {
      if (!/^[a-z0-9-]+\.(?:mjs|cjs|json)$/.test(name)) throw new Error("Invalid helper name");
      const file = path.join(dir, name), incoming = sha(body);
      try {
        let current, regular = true;
        try {
          regular = fs.lstatSync(file).isFile();
          if (regular) current = sha(fs.readFileSync(file));
        } catch (error) { if (error.code !== "ENOENT") throw error; }
        if (regular && (current === undefined || current === incoming ||
            current === previous[name] || legacy[name]?.includes(current))) {
          if (current !== incoming) {
            write(file, body);
            result.upgraded.push(name);
          }
          hashes[name] = incoming;
          // Retire stale, known shipment candidates too. An unrecognized
          // comparison may contain useful local edits; leave it for the manager.
          const candidate = file + ".shipped";
          if (fs.existsSync(candidate) && fs.lstatSync(candidate).isFile()) {
            const digest = sha(fs.readFileSync(candidate));
            if (digest === incoming || digest === previous[name] || legacy[name]?.includes(digest))
              fs.rmSync(candidate);
          }
        } else {
          const candidate = file + ".shipped";
          if (!fs.existsSync(candidate) || !fs.lstatSync(candidate).isFile() ||
              sha(fs.readFileSync(candidate)) !== incoming) write(candidate, body);
          result.customized.push(name);
        }
      } catch (error) { result.errors.push(`${name}: ${error.message}`); }
    }
    const body = JSON.stringify({ format: 1, tools: hashes }, null, 2) + "\n";
    if (!fs.existsSync(manifest) || fs.readFileSync(manifest, "utf8") !== body) write(manifest, body);
  } catch (error) { result.errors.push(error.message); }
  return result;
}

module.exports = { place };
