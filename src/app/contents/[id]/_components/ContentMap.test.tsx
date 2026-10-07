import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  installKakaoMock,
  type KakaoMockInstances,
  uninstallKakaoMock,
} from "@/test/kakaoMapMock";

const loadKakaoMaps = vi.fn(() => Promise.resolve());
vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => loadKakaoMaps(),
  onKakaoMapsLateReady: () => () => {},
}));

import { ContentMap } from "./ContentMap";

let instances: KakaoMockInstances;

describe("ContentMap", () => {
  beforeEach(() => {
    loadKakaoMaps.mockReturnValue(Promise.resolve());
    instances = installKakaoMock();
  });

  afterEach(() => {
    uninstallKakaoMock();
  });

  it("좌표를 중심으로 지도 1개와 마커 1개를 그린다", async () => {
    render(<ContentMap latitude={35.2} longitude={127.6} name="쌍계사" />);

    await waitFor(() => expect(instances.maps).toHaveLength(1));
    expect(instances.overlays).toHaveLength(1);
    expect(instances.maps[0].setCenter).toHaveBeenCalled();
  });

  it("확대 버튼은 레벨을 낮추고 축소 버튼은 레벨을 높인다", async () => {
    render(<ContentMap latitude={35.2} longitude={127.6} name="쌍계사" />);

    await waitFor(() => expect(instances.maps).toHaveLength(1));
    const map = instances.maps[0];

    await userEvent.click(screen.getByLabelText("지도 축소"));
    expect(map.setLevel).toHaveBeenLastCalledWith(5);

    await userEvent.click(screen.getByLabelText("지도 확대"));
    expect(map.setLevel).toHaveBeenLastCalledWith(4);
  });

  it("SDK 로드에 실패하면 에러 문구를 보이고 확대/축소 버튼을 숨긴다", async () => {
    loadKakaoMaps.mockReturnValue(Promise.reject(new Error("fail")));
    render(<ContentMap latitude={35.2} longitude={127.6} name="쌍계사" />);

    await waitFor(() =>
      expect(screen.getByText("지도를 불러오지 못했어요")).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("지도 확대")).not.toBeInTheDocument();
  });

  it("언마운트하면 마커를 정리한다", async () => {
    const { unmount } = render(
      <ContentMap latitude={35.2} longitude={127.6} name="쌍계사" />,
    );

    await waitFor(() => expect(instances.overlays).toHaveLength(1));
    const overlay = instances.overlays[0];
    unmount();

    expect(overlay.setMap).toHaveBeenLastCalledWith(null);
  });
});
