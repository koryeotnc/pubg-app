"""
PUBG 맵 이미지를 Leaflet 타일로 변환하는 스크립트.

사용법:
    python generate-tiles.py <입력이미지> <출력디렉토리> [타일크기]

예시:
    python generate-tiles.py ../source-maps/erangel.png ../tiles/erangel 256

필요 패키지:
    pip install Pillow
"""

import sys
import os
import math
from PIL import Image


def generate_tiles(input_path, output_dir, tile_size=256):
    print(f"입력 이미지: {input_path}")
    print(f"출력 디렉토리: {output_dir}")
    print(f"타일 크기: {tile_size}x{tile_size}")

    img = Image.open(input_path)
    width, height = img.size
    print(f"이미지 크기: {width}x{height}")

    # 정사각형이 아니면 맞추기
    max_dim = max(width, height)
    if width != height:
        square = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
        square.paste(img, (0, 0))
        img = square
        print(f"정사각형으로 조정: {max_dim}x{max_dim}")

    # 최대 줌 레벨 계산
    max_zoom = math.ceil(math.log2(max_dim / tile_size))
    print(f"최대 줌 레벨: {max_zoom}")

    total_tiles = 0

    for z in range(max_zoom + 1):
        scaled_size = tile_size * (2 ** z)
        num_tiles = 2 ** z

        print(f"\n줌 레벨 {z}: {scaled_size}x{scaled_size} ({num_tiles}x{num_tiles} = {num_tiles**2} 타일)")

        # 이미지 리사이즈
        resized = img.resize((scaled_size, scaled_size), Image.LANCZOS)

        for x in range(num_tiles):
            tile_dir = os.path.join(output_dir, str(z), str(x))
            os.makedirs(tile_dir, exist_ok=True)

            for y in range(num_tiles):
                left = x * tile_size
                upper = y * tile_size
                right = left + tile_size
                lower = upper + tile_size

                tile = resized.crop((left, upper, right, lower))
                tile_path = os.path.join(tile_dir, f"{y}.png")
                tile.save(tile_path, 'PNG', optimize=True)
                total_tiles += 1

    print(f"\n완료! 총 {total_tiles}개 타일 생성됨")
    print(f"출력 위치: {output_dir}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("사용법: python generate-tiles.py <입력이미지> <출력디렉토리> [타일크기]")
        print("예시: python generate-tiles.py ../source-maps/erangel.png ../tiles/erangel 256")
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = sys.argv[2]
    tile_size = int(sys.argv[3]) if len(sys.argv) > 3 else 256

    if not os.path.exists(input_path):
        print(f"오류: 파일을 찾을 수 없습니다: {input_path}")
        sys.exit(1)

    generate_tiles(input_path, output_dir, tile_size)
