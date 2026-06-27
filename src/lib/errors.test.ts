import { describe, expect, it } from "vitest";
import { parseApiError } from "./errors";

describe("parseApiError", () => {
  it("case 1: API 4xx JSON body with code, message, traceId", () => {
    const err = new Error(
      'API 400: {"code":"INVALID_REQUEST","message":"유효하지 않은 요청입니다","traceId":"trace-123"}',
    );
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "유효하지 않은 요청입니다",
      code: "INVALID_REQUEST",
      traceId: "trace-123",
    });
  });

  it("case 2: API 4xx JSON body with message only", () => {
    const err = new Error('API 404: {"message":"리소스를 찾을 수 없습니다"}');
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "리소스를 찾을 수 없습니다",
      code: undefined,
      traceId: undefined,
    });
  });

  it("case 3: API 5xx JSON body with all fields", () => {
    const err = new Error(
      'API 500: {"code":"INTERNAL_SERVER_ERROR","message":"서버 오류가 발생했습니다","traceId":"trace-456"}',
    );
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "서버 오류가 발생했습니다",
      code: "INTERNAL_SERVER_ERROR",
      traceId: "trace-456",
    });
  });

  it("case 4: API 4xx with raw text body (non-JSON)", () => {
    const err = new Error("API 400: Bad Request");
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });

  it("case 5: Failed to fetch error", () => {
    const err = new Error("Failed to fetch");
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "네트워크 연결을 확인하고 다시 시도해주세요.",
    });
  });

  it("case 6: NetworkError message", () => {
    const err = new Error("NetworkError: Connection refused");
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "네트워크 연결을 확인하고 다시 시도해주세요.",
    });
  });

  it("case 7: Generic Error (not API format)", () => {
    const err = new Error("Some random error");
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });

  it("case 8: null input", () => {
    const result = parseApiError(null);
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });

  it("case 9: empty string input", () => {
    const result = parseApiError("");
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });

  it("case 10: API error with invalid JSON in body", () => {
    const err = new Error("API 400: {invalid json}");
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });

  it("case 11: API error with message field that is not a string", () => {
    const err = new Error('API 400: {"message":123}');
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });

  it("case 12: fetch error containing fetch keyword", () => {
    const err = new Error("Cannot fetch resource");
    const result = parseApiError(err);
    expect(result).toEqual({
      message: "네트워크 연결을 확인하고 다시 시도해주세요.",
    });
  });

  it("case 13: undefined input", () => {
    const result = parseApiError(undefined);
    expect(result).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });
});
