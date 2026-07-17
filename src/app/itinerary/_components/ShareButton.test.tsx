import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import * as shareServiceModule from "@/services/shareService";
import { ShareButton } from "./ShareButton";

vi.mock("@/services/shareService");

describe("ShareButton", () => {
  const mockCreateShare = vi.mocked(shareServiceModule.createShare);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("초기 상태는 '공유하기' 버튼을 표시한다", () => {
    render(<ShareButton itineraryId="itinerary-1" />);

    expect(
      screen.getByRole("button", { name: "공유하기" }),
    ).toBeInTheDocument();
  });

  it("클릭 시 로딩 상태를 거쳐 공유 링크를 표시한다", async () => {
    mockCreateShare.mockResolvedValue({
      token: "share-token-1",
      shareUrl: "https://pick-trip.example.com/share/share-token-1",
    });

    render(<ShareButton itineraryId="itinerary-1" />);

    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));

    expect(mockCreateShare).toHaveBeenCalledWith("itinerary-1");
    expect(
      await screen.findByDisplayValue(
        "https://pick-trip.example.com/share/share-token-1",
      ),
    ).toBeInTheDocument();
  });

  it("복사 버튼 클릭 시 클립보드에 공유 링크를 복사하고 '복사됨'을 표시한다", async () => {
    mockCreateShare.mockResolvedValue({
      token: "share-token-1",
      shareUrl: "https://pick-trip.example.com/share/share-token-1",
    });

    render(<ShareButton itineraryId="itinerary-1" />);
    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));
    await screen.findByDisplayValue(
      "https://pick-trip.example.com/share/share-token-1",
    );

    await userEvent.click(screen.getByRole("button", { name: "복사" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://pick-trip.example.com/share/share-token-1",
    );
    expect(
      await screen.findByRole("button", { name: "복사됨" }),
    ).toBeInTheDocument();
  });

  it("생성 실패 시 에러 메시지와 재시도 버튼을 표시한다", async () => {
    mockCreateShare.mockRejectedValue(
      new ApiError(500, "공유 링크 생성에 실패했습니다.", "INTERNAL_ERROR"),
    );

    render(<ShareButton itineraryId="itinerary-1" />);
    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));

    expect(
      await screen.findByText("공유 링크 생성에 실패했습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
  });

  it("재시도 버튼 클릭 시 다시 createShare를 호출한다", async () => {
    mockCreateShare
      .mockRejectedValueOnce(
        new ApiError(500, "공유 링크 생성에 실패했습니다.", "INTERNAL_ERROR"),
      )
      .mockResolvedValueOnce({
        token: "share-token-1",
        shareUrl: "https://pick-trip.example.com/share/share-token-1",
      });

    render(<ShareButton itineraryId="itinerary-1" />);
    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));
    await screen.findByRole("button", { name: "다시 시도" });

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByDisplayValue(
        "https://pick-trip.example.com/share/share-token-1",
      ),
    ).toBeInTheDocument();
    expect(mockCreateShare).toHaveBeenCalledTimes(2);
  });
});
