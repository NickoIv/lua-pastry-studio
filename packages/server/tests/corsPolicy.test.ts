import { describe, expect, it } from "vitest";
import { buildCorsOptions, isAllowedDevOrigin } from "../src/corsPolicy";

describe("isAllowedDevOrigin", () => {
  it("allows localhost/127.0.0.1 on the three known Vite dev ports", () => {
    expect(isAllowedDevOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedDevOrigin("http://127.0.0.1:5174")).toBe(true);
    expect(isAllowedDevOrigin("http://localhost:5175")).toBe(true);
  });

  it("allows a private LAN IP on those same ports (a phone on the same Wi-Fi)", () => {
    expect(isAllowedDevOrigin("http://192.168.1.42:5173")).toBe(true);
    expect(isAllowedDevOrigin("http://10.0.0.5:5173")).toBe(true);
    expect(isAllowedDevOrigin("http://172.20.3.7:5173")).toBe(true);
  });

  it("rejects a public IP or arbitrary domain even on a known port", () => {
    expect(isAllowedDevOrigin("http://93.184.216.34:5173")).toBe(false);
    expect(isAllowedDevOrigin("https://evil.example.com:5173")).toBe(false);
  });

  it("rejects a known-safe host on an unexpected port", () => {
    expect(isAllowedDevOrigin("http://localhost:3000")).toBe(false);
    expect(isAllowedDevOrigin("http://192.168.1.42:8080")).toBe(false);
  });

  it("rejects a private-looking IP just outside the 172.16/12 range", () => {
    expect(isAllowedDevOrigin("http://172.15.0.1:5173")).toBe(false);
    expect(isAllowedDevOrigin("http://172.32.0.1:5173")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isAllowedDevOrigin("not-a-url")).toBe(false);
    expect(isAllowedDevOrigin("")).toBe(false);
  });
});

describe("buildCorsOptions", () => {
  it("uses the dev-pattern origin function when CORS_ORIGIN is unset/'*'", () => {
    const options = buildCorsOptions("*");
    expect(typeof options.origin).toBe("function");
  });

  it("uses a plain allow-list when CORS_ORIGIN is set to explicit origins", () => {
    const options = buildCorsOptions("https://admin.example.com, https://guest.example.com");
    expect(options.origin).toEqual(["https://admin.example.com", "https://guest.example.com"]);
  });
});
