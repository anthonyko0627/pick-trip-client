import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, parseApiError, toApiError } from "./errors";

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    config,
    {},
    {
      status,
      statusText: "",
      data,
      headers: new AxiosHeaders(),
      config,
    },
  );
}

function axiosNetworkError(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK", {
    headers: new AxiosHeaders(),
  });
}

describe("toApiError", () => {
  it("서버 에러 계약(code/message/traceId)을 status와 함께 보존한다", () => {
    const result = toApiError(
      axiosErrorWithResponse(401, {
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
        traceId: "trace-1",
      }),
    );

    expect(result).toBeInstanceOf(ApiError);
    expect(result.status).toBe(401);
    expect(result.message).toBe("로그인이 필요합니다.");
    expect(result.code).toBe("AUTH_REQUIRED");
    expect(result.traceId).toBe("trace-1");
  });

  it("message만 있는 응답은 code/traceId를 undefined로 둔다", () => {
    const result = toApiError(
      axiosErrorWithResponse(404, { message: "일정을 찾을 수 없습니다." }),
    );

    expect(result.status).toBe(404);
    expect(result.message).toBe("일정을 찾을 수 없습니다.");
    expect(result.code).toBeUndefined();
    expect(result.traceId).toBeUndefined();
  });

  it("계약에 맞지 않는 바디(비-JSON 문자열)는 폴백 메시지를 쓰되 status는 보존한다", () => {
    const result = toApiError(axiosErrorWithResponse(400, "Bad Request"));

    expect(result.status).toBe(400);
    expect(result.message).toBe(
      "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
    expect(result.code).toBeUndefined();
  });

  it("message가 문자열이 아니면 폴백 메시지를 쓴다", () => {
    const result = toApiError(axiosErrorWithResponse(400, { message: 123 }));

    expect(result.message).toBe(
      "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
  });

  it("응답이 없는 네트워크 오류는 status 0과 네트워크 메시지로 정규화한다", () => {
    const result = toApiError(axiosNetworkError());

    expect(result.status).toBe(0);
    expect(result.message).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
  });

  it("AxiosError가 아닌 값은 status 0과 폴백 메시지로 정규화한다", () => {
    const result = toApiError(new Error("boom"));

    expect(result.status).toBe(0);
    expect(result.message).toBe(
      "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
  });
});

describe("parseApiError - ApiError 입력", () => {
  it("ApiError의 message/code/traceId를 그대로 옮긴다", () => {
    const err = new ApiError(
      401,
      "로그인이 필요합니다.",
      "AUTH_REQUIRED",
      "trace-1",
    );

    expect(parseApiError(err)).toEqual({
      message: "로그인이 필요합니다.",
      code: "AUTH_REQUIRED",
      traceId: "trace-1",
    });
  });

  it("네트워크 ApiError는 네트워크 메시지를 유지한다", () => {
    const err = new ApiError(0, "네트워크 연결을 확인하고 다시 시도해주세요.");

    expect(parseApiError(err)).toEqual({
      message: "네트워크 연결을 확인하고 다시 시도해주세요.",
      code: undefined,
      traceId: undefined,
    });
  });

  it("ApiError가 아닌 값은 폴백 메시지를 반환한다", () => {
    expect(parseApiError(new Error("boom"))).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(parseApiError(null)).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(parseApiError(undefined)).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });
});
