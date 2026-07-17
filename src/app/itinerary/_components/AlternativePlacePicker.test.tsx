import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import * as contentServiceModule from "@/services/contentService";
import { AlternativePlacePicker } from "./AlternativePlacePicker";

vi.mock("@/services/contentService");

describe("AlternativePlacePicker", () => {
  const mockGetContents = vi.mocked(contentServiceModule.getContents);

  it("로딩 중에는 로딩 문구를 표시한다", () => {
    mockGetContents.mockReturnValue(new Promise(() => {}));

    render(
      <AlternativePlacePicker
        region="HADONG"
        travelDate="2026-08-01"
        duration={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("불러오는 중...")).toBeInTheDocument();
  });

  it("후보가 없으면 빈 상태 메시지를 표시한다", async () => {
    mockGetContents.mockResolvedValue({ contents: [], total: 0 });

    render(
      <AlternativePlacePicker
        region="HADONG"
        travelDate="2026-08-01"
        duration={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("추천할 대체 장소가 없습니다"),
    ).toBeInTheDocument();
  });

  it("조회 실패 시 에러 메시지를 표시한다", async () => {
    mockGetContents.mockRejectedValue(
      new ApiError(500, "조회에 실패했습니다.", "INTERNAL_ERROR"),
    );

    render(
      <AlternativePlacePicker
        region="HADONG"
        travelDate="2026-08-01"
        duration={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("조회에 실패했습니다.")).toBeInTheDocument();
  });

  it("후보 목록을 표시하고, 지역/날짜/기간 기준으로 getContents를 호출한다", async () => {
    mockGetContents.mockResolvedValue({
      contents: [
        {
          id: "content-3",
          name: "화개장터",
          region: "HADONG",
          imageUrl: null,
          address: "경남 하동군 화개면",
        },
      ],
      total: 1,
    });

    render(
      <AlternativePlacePicker
        region="HADONG"
        travelDate="2026-08-01"
        duration={1}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("화개장터")).toBeInTheDocument();
    expect(mockGetContents).toHaveBeenCalledWith({
      regions: ["HADONG"],
      startDate: "2026-08-01",
      nights: 1,
    });
  });

  it("'이 장소로 교체' 클릭 시 onSelect에 선택한 콘텐츠를 전달한다", async () => {
    const content = {
      id: "content-3",
      name: "화개장터",
      region: "HADONG" as const,
      imageUrl: null,
      address: "경남 하동군 화개면",
    };
    mockGetContents.mockResolvedValue({ contents: [content], total: 1 });
    const onSelect = vi.fn();

    render(
      <AlternativePlacePicker
        region="HADONG"
        travelDate="2026-08-01"
        duration={1}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "이 장소로 교체" }),
    );

    expect(onSelect).toHaveBeenCalledWith(content);
  });

  it("닫기 버튼 클릭 시 onClose를 호출한다", async () => {
    mockGetContents.mockResolvedValue({ contents: [], total: 0 });
    const onClose = vi.fn();

    render(
      <AlternativePlacePicker
        region="HADONG"
        travelDate="2026-08-01"
        duration={1}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    await waitFor(() => screen.getByLabelText("닫기"));
    await userEvent.click(screen.getByLabelText("닫기"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
