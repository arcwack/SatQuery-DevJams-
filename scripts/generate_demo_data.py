"""Regenerate the demo Sentinel rasters with a coherent land-cover story.

Story: a river runs down the middle, vegetation on the left, and built-up
land grows along the river on the right over 2018 -> 2026.

Band order matches gis_engine: 1=red, 2=nir, 3=green.
"""

from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

SIZE = 50
PIXEL = 0.02  # degrees per pixel
WEST, SOUTH, EAST, NORTH = -0.5, -0.5, 0.5, 0.5
OUT_DIR = Path(__file__).resolve().parent.parent / "data"

# reflectance per class: (red, nir, green)
VALUES = {
    "water": (0.15, 0.05, 0.25),
    "vegetation": (0.12, 0.75, 0.35),
    "built_up": (0.45, 0.40, 0.30),
}

# built-up extent per year: (row_start, col_start, col_end) along the river
BUILT_UP = {
    2018: (35, 25, 29),
    2020: (25, 25, 34),
    2026: (10, 25, 44),
}


def make_raster(year: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    water = np.zeros((SIZE, SIZE), dtype=bool)
    water[:, 20:25] = True

    row_start, col_start, col_end = BUILT_UP[year]
    built_up = np.zeros((SIZE, SIZE), dtype=bool)
    built_up[row_start:, col_start:col_end + 1] = True

    vegetation = ~water & ~built_up

    red = np.full((SIZE, SIZE), VALUES["built_up"][0], dtype=np.float32)
    nir = np.full((SIZE, SIZE), VALUES["built_up"][1], dtype=np.float32)
    green = np.full((SIZE, SIZE), VALUES["built_up"][2], dtype=np.float32)

    for cls, mask in (("water", water), ("vegetation", vegetation)):
        r, n, g = VALUES[cls]
        red[mask] = r
        nir[mask] = n
        green[mask] = g

    noise = (rng.random((SIZE, SIZE)) - 0.5) * 0.04
    red += noise
    nir += noise
    green += noise
    return red, nir, green


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    transform = from_origin(WEST, NORTH, PIXEL, PIXEL)
    for year in BUILT_UP:
        rng = np.random.default_rng(year)
        red, nir, green = make_raster(year, rng)
        path = OUT_DIR / f"sentinel_{year}.tif"
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            height=SIZE,
            width=SIZE,
            count=3,
            dtype="float32",
            crs="EPSG:4326",
            transform=transform,
        ) as dst:
            dst.write(red, 1)
            dst.write(nir, 2)
            dst.write(green, 3)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
