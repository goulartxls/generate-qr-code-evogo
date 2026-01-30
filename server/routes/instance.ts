import { Router, type Request, type Response } from "express";

const router = Router();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!;
const MASTER_API_KEY = process.env.MASTER_API_KEY!;

function getInstanceToken(req: Request): string {
  const auth = req.headers.authorization ?? "";
  return auth.replace(/^Bearer\s+/i, "");
}

async function proxyRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Apikey: apiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  return { status: res.status, data };
}

// POST /create — uses MASTER_API_KEY
router.post("/create", async (req: Request, res: Response) => {
  try {
    const instanceToken = crypto.randomUUID();
    const body = { name: req.body.name, token: instanceToken };
    console.log("[create] body:", JSON.stringify(body));
    const result = await proxyRequest(
      "POST",
      "/instance/create",
      MASTER_API_KEY,
      body
    );
    console.log("[create] response:", result.status, JSON.stringify(result.data));
    res.status(result.status).json({ ...result.data as object, token: instanceToken });
  } catch (error) {
    console.error("[create]", error);
    res.status(500).json({ error: "Failed to create instance" });
  }
});

// GET /status — uses instance token
router.get("/status", async (req: Request, res: Response) => {
  try {
    const token = getInstanceToken(req);
    const result = await proxyRequest("GET", "/instance/status", token);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("[status]", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

// GET /qr — uses instance token
router.get("/qr", async (req: Request, res: Response) => {
  try {
    const token = getInstanceToken(req);
    const result = await proxyRequest("GET", "/instance/qr", token);
    console.log("[qr] response:", result.status, JSON.stringify(result.data).substring(0, 200));
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("[qr]", error);
    res.status(500).json({ error: "Failed to get QR code" });
  }
});

// POST /pair — uses instance token
router.post("/pair", async (req: Request, res: Response) => {
  try {
    const token = getInstanceToken(req);
    console.log("[pair] body:", JSON.stringify(req.body));
    const result = await proxyRequest(
      "POST",
      "/instance/pair",
      token,
      req.body
    );
    console.log("[pair] response:", result.status, JSON.stringify(result.data));
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("[pair]", error);
    res.status(500).json({ error: "Failed to pair instance" });
  }
});

// POST /disconnect — uses instance token
router.post("/disconnect", async (req: Request, res: Response) => {
  try {
    const token = getInstanceToken(req);
    const result = await proxyRequest("POST", "/instance/disconnect", token);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("[disconnect]", error);
    res.status(500).json({ error: "Failed to disconnect instance" });
  }
});

// DELETE /logout — uses instance token
router.delete("/logout", async (req: Request, res: Response) => {
  try {
    const token = getInstanceToken(req);
    const result = await proxyRequest("DELETE", "/instance/logout", token);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("[logout]", error);
    res.status(500).json({ error: "Failed to logout instance" });
  }
});

export default router;
