import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { apiClient } from "./apiClient";

describe("apiClient", () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("성공 응답의 data를 그대로 돌려준다", async () => {
    apiClient.defaults.adapter = async (config) => ({
      data: { id: "1" },
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
      config,
    });

    const response = await apiClient.get<{ id: string }>("/api/v1/example");

    expect(response.data).toEqual({ id: "1" });
  });

  it("서버 에러 계약 응답을 ApiError로 정규화해 reject한다", async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          status: 401,
          statusText: "Unauthorized",
          data: {
            code: "AUTH_REQUIRED",
            message: "로그인이 필요합니다.",
            traceId: "trace-1",
          },
          headers: new AxiosHeaders(),
          config,
        },
      );
    };

    const error = await apiClient.get("/api/v1/example").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("AUTH_REQUIRED");
    expect(error.message).toBe("로그인이 필요합니다.");
    expect(error.traceId).toBe("trace-1");
  });

  it("네트워크 오류(응답 없음)도 ApiError로 정규화해 reject한다", async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError("Network Error", "ERR_NETWORK", config);
    };

    const error = await apiClient.get("/api/v1/example").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
  });
});
