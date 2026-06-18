const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export async function submitWeb3Form(fields) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("WEB3FORMS_ACCESS_KEY is missing. Add it in server .env.");
  }

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      botcheck: "",
      ...fields,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    const message =
      result.message || `Web3Forms request failed with status ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.response = result;
    throw error;
  }

  return result;
}
