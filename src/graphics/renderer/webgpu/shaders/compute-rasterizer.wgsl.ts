export const SHADER_CODE: string = `
struct PixelBuffer {
  data: array<u32>,
};

const textureCount = 50;

// Look-up tables
struct LUTs {
  palette: array<u32, 65536>,
  texturesTranslucent: array<i32, textureCount>,
  textures: array<array<u32, 65536>, textureCount>,
};

@group(0) @binding(0) var<storage, read_write> pixelBuffer: PixelBuffer;
@group(0) @binding(1) var<storage, read_write> depthBuffer: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read> luts: LUTs;
@group(1) @binding(0) var<storage, read> triangleData: array<i32>;

@compute @workgroup_size(256, 1)
fn clear(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  pixelBuffer.data[index] = 0u;
  atomicStore(&depthBuffer[index], 0u);
}

const width = 512;
const height = 334;

const centerX = width / 2;
const centerY = height / 2;
// const centerX = 256;
// const centerY = 167;

const boundRight = width;
const boundBottom = height;
// const boundBottom = 334;
const boundX = width - 1;
// const boundX = 512 - 1;

var<private> jagged = true;
var<private> clipX = false;
var<private> alpha = 0u;

var<private> opaqueTexture = true;

var<private> depth = 0u;
var<private> writeDepth = false;

@compute @workgroup_size(1, 1)
fn renderFlat(@builtin(global_invocation_id) global_id: vec3u) {
  let offset = global_id.x * 8;
  depth = u32(triangleData[offset]);
  rasterTriangle(
    triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
    triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
    u32(triangleData[offset + 7]),
  );
}

@compute @workgroup_size(1, 1)
fn renderFlatDepth(@builtin(global_invocation_id) global_id: vec3u) {
  let offset = global_id.x * 8;
  depth = u32(triangleData[offset]);
  writeDepth = true;
  rasterTriangle(
    triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
    triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
    0,
  );
}

@compute @workgroup_size(1, 1)
fn renderGouraud(@builtin(global_invocation_id) global_id: vec3u) {
  let offset = global_id.x * 10;
  depth = u32(triangleData[offset]);
  rasterGouraudTriangle(
    triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
    triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
    triangleData[offset + 7], triangleData[offset + 8], triangleData[offset + 9],
  );
}

@compute @workgroup_size(1, 1)
fn renderGouraudDepth(@builtin(global_invocation_id) global_id: vec3u) {
  let offset = global_id.x * 10;
  depth = u32(triangleData[offset]);
  writeDepth = true;
  rasterTriangle(
    triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
    triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
    0,
  );
}

@compute @workgroup_size(1, 1)
fn renderTextured(@builtin(global_invocation_id) global_id: vec3u) {
  let offset = global_id.x * 20;
  depth = u32(triangleData[offset]);
  rasterTexturedTriangle(
    triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
    triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
    triangleData[offset + 7], triangleData[offset + 8], triangleData[offset + 9],
    triangleData[offset + 10], triangleData[offset + 11], triangleData[offset + 12],
    triangleData[offset + 13], triangleData[offset + 14], triangleData[offset + 15],
    triangleData[offset + 16], triangleData[offset + 17], triangleData[offset + 18],
    triangleData[offset + 19],
  );
}

@compute @workgroup_size(1, 1)
fn renderTexturedDepth(@builtin(global_invocation_id) global_id: vec3u) {
  let offset = global_id.x * 20;
  depth = u32(triangleData[offset]);
  writeDepth = true;
  opaqueTexture = luts.texturesTranslucent[triangleData[offset + 19]] == 0;
  if (opaqueTexture) {
    rasterTriangle(
      triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
      triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
      0,
    );
  } else {
    rasterTexturedTriangle(
      triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
      triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
      triangleData[offset + 7], triangleData[offset + 8], triangleData[offset + 9],
      triangleData[offset + 10], triangleData[offset + 11], triangleData[offset + 12],
      triangleData[offset + 13], triangleData[offset + 14], triangleData[offset + 15],
      triangleData[offset + 16], triangleData[offset + 17], triangleData[offset + 18],
      triangleData[offset + 19],
    );
  }
}

@compute @workgroup_size(1, 1)
fn renderAlpha(@builtin(global_invocation_id) global_id: vec3u) {
  let triangleCount = i32(arrayLength(&triangleData)) / 10;
  for (var i = 0; i < triangleCount; i++) {
    let offset = i * 10;
    depth = u32(triangleData[offset] & 0x7fffff);
    alpha = u32((triangleData[offset] >> 23) & 0xff);
    var isFlat = (u32(triangleData[offset]) >> 31) == 1;
    if (isFlat) {
      rasterTriangle(
        triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
        triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
        u32(triangleData[offset + 7]),
      );
    } else {
      rasterGouraudTriangle(
        triangleData[offset + 1], triangleData[offset + 2], triangleData[offset + 3],
        triangleData[offset + 4], triangleData[offset + 5], triangleData[offset + 6],
        triangleData[offset + 7], triangleData[offset + 8], triangleData[offset + 9],
      );
    }
  }
}

fn setPixel(index: i32, value: u32) {
  if (atomicLoad(&depthBuffer[index]) <= depth) {
    pixelBuffer.data[index] = value;
  }
}

fn rasterTriangle(x0In: i32, x1In: i32, x2In: i32, y0In: i32, y1In: i32, y2In: i32, color: u32) {
  var x0 = x0In;
  var x1 = x1In;
  var x2 = x2In;
  var y0 = y0In;
  var y1 = y1In;
  var y2 = y2In;
  clipX = x0 < 0 || x1 < 0 || x2 < 0 || x0 > boundX || x1 > boundX || x2 > boundX;
  var xStepAB = 0;
  if (y1 != y0) {
    xStepAB = ((x1 - x0) << 16) / (y1 - y0);
  }
  var xStepBC = 0;
  if (y2 != y1) {
    xStepBC = ((x2 - x1) << 16) / (y2 - y1);
  }
  var xStepAC = 0;
  if (y2 != y0) {
    xStepAC = ((x0 - x2) << 16) / (y0 - y2);
  }
  if (y0 <= y1 && y0 <= y2) {
    if (y0 < boundBottom) {
      if (y1 > boundBottom) {
        y1 = boundBottom;
      }
      if (y2 > boundBottom) {
        y2 = boundBottom;
      }
      if (y1 < y2) {
        x0 <<= 0x10;
        x2 = x0;
        if (y0 < 0) {
          x2 -= xStepAC * y0;
          x0 -= xStepAB * y0;
          y0 = 0;
        }
        x1 <<= 0x10;
        if (y1 < 0) {
          x1 -= xStepBC * y1;
          y1 = 0;
        }
        if ((y0 != y1 && xStepAC < xStepAB) || (y0 == y1 && xStepAC > xStepBC)) {
          y2 -= y1;
          y1 -= y0;
          y0 = y0 * width;
          while (true) {
            y1--;
            if (y1 < 0) {
              while (true) {
                y2--;
                if (y2 < 0) {
                  return;
                }
                rasterScanline(x2 >> 16, x1 >> 16, y0, color);
                x2 += xStepAC;
                x1 += xStepBC;
                y0 += width;
              }
            }
            rasterScanline(x2 >> 16, x0 >> 16, y0, color);
            x2 += xStepAC;
            x0 += xStepAB;
            y0 += width;
          }
        } else {
          y2 -= y1;
          y1 -= y0;
          y0 = y0 * width;
          while (true) {
            y1--;
            if (y1 < 0) {
              while (true) {
                y2--;
                if (y2 < 0) {
                  return;
                }
                rasterScanline(x1 >> 16, x2 >> 16, y0, color);
                x2 += xStepAC;
                x1 += xStepBC;
                y0 += width;
              }
            }
            rasterScanline(x0 >> 16, x2 >> 16, y0, color);
            x2 += xStepAC;
            x0 += xStepAB;
            y0 += width;
          }
        }
      } else {
        x0 <<= 0x10;
        x1 = x0;
        if (y0 < 0) {
          x1 -= xStepAC * y0;
          x0 -= xStepAB * y0;
          y0 = 0;
        }
        x2 <<= 0x10;
        if (y2 < 0) {
          x2 -= xStepBC * y2;
          y2 = 0;
        }
        if ((y0 != y2 && xStepAC < xStepAB) || (y0 == y2 && xStepBC > xStepAB)) {
          y1 -= y2;
          y2 -= y0;
          y0 = y0 * width;
          while (true) {
            y2--;
            if (y2 < 0) {
              while (true) {
                y1--;
                if (y1 < 0) {
                  return;
                }
                rasterScanline(x2 >> 16, x0 >> 16, y0, color);
                x2 += xStepBC;
                x0 += xStepAB;
                y0 += width;
              }
            }
            rasterScanline(x1 >> 16, x0 >> 16, y0, color);
            x1 += xStepAC;
            x0 += xStepAB;
            y0 += width;
          }
        } else {
          y1 -= y2;
          y2 -= y0;
          y0 = y0 * width;
          while (true) {
            y2--;
            if (y2 < 0) {
              while (true) {
                y1--;
                if (y1 < 0) {
                  return;
                }
                rasterScanline(x0 >> 16, x2 >> 16, y0, color);
                x2 += xStepBC;
                x0 += xStepAB;
                y0 += width;
              }
            }
            rasterScanline(x0 >> 16, x1 >> 16, y0, color);
            x1 += xStepAC;
            x0 += xStepAB;
            y0 += width;
          }
        }
      }
    }
  } else if (y1 <= y2) {
    if (y1 < boundBottom) {
      if (y2 > boundBottom) {
        y2 = boundBottom;
      }
      if (y0 > boundBottom) {
        y0 = boundBottom;
      }
      if (y2 < y0) {
        x1 <<= 0x10;
        x0 = x1;
        if (y1 < 0) {
          x0 -= xStepAB * y1;
          x1 -= xStepBC * y1;
          y1 = 0;
        }
        x2 <<= 0x10;
        if (y2 < 0) {
          x2 -= xStepAC * y2;
          y2 = 0;
        }
        if ((y1 != y2 && xStepAB < xStepBC) || (y1 == y2 && xStepAB > xStepAC)) {
          y0 -= y2;
          y2 -= y1;
          y1 = y1 * width;
          while (true) {
            y2--;
            if (y2 < 0) {
              while (true) {
                y0--;
                if (y0 < 0) {
                  return;
                }
                rasterScanline(x0 >> 16, x2 >> 16, y1, color);
                x0 += xStepAB;
                x2 += xStepAC;
                y1 += width;
              }
            }
            rasterScanline(x0 >> 16, x1 >> 16, y1, color);
            x0 += xStepAB;
            x1 += xStepBC;
            y1 += width;
          }
        } else {
          y0 -= y2;
          y2 -= y1;
          y1 = y1 * width;
          while (true) {
            y2--;
            if (y2 < 0) {
              while (true) {
                y0--;
                if (y0 < 0) {
                  return;
                }
                rasterScanline(x2 >> 16, x0 >> 16, y1, color);
                x0 += xStepAB;
                x2 += xStepAC;
                y1 += width;
              }
            }
            rasterScanline(x1 >> 16, x0 >> 16, y1, color);
            x0 += xStepAB;
            x1 += xStepBC;
            y1 += width;
          }
        }
      } else {
        x1 <<= 0x10;
        x2 = x1;
        if (y1 < 0) {
          x2 -= xStepAB * y1;
          x1 -= xStepBC * y1;
          y1 = 0;
        }
        x0 <<= 0x10;
        if (y0 < 0) {
          x0 -= xStepAC * y0;
          y0 = 0;
        }
        if (xStepAB < xStepBC) {
          y2 -= y0;
          y0 -= y1;
          y1 = y1 * width;
          while (true) {
            y0--;
            if (y0 < 0) {
              while (true) {
                y2--;
                if (y2 < 0) {
                  return;
                }
                rasterScanline(x0 >> 16, x1 >> 16, y1, color);
                x0 += xStepAC;
                x1 += xStepBC;
                y1 += width;
              }
            }
            rasterScanline(x2 >> 16, x1 >> 16, y1, color);
            x2 += xStepAB;
            x1 += xStepBC;
            y1 += width;
          }
        } else {
          y2 -= y0;
          y0 -= y1;
          y1 = y1 * width;
          while (true) {
            y0--;
            if (y0 < 0) {
              while (true) {
                y2--;
                if (y2 < 0) {
                  return;
                }
                rasterScanline(x1 >> 16, x0 >> 16, y1, color);
                x0 += xStepAC;
                x1 += xStepBC;
                y1 += width;
              }
            }
            rasterScanline(x1 >> 16, x2 >> 16, y1, color);
            x2 += xStepAB;
            x1 += xStepBC;
            y1 += width;
          }
        }
      }
    }
  } else if (y2 < boundBottom) {
    if (y0 > boundBottom) {
      y0 = boundBottom;
    }
    if (y1 > boundBottom) {
      y1 = boundBottom;
    }
    if (y0 < y1) {
      x2 <<= 0x10;
      x1 = x2;
      if (y2 < 0) {
        x1 -= xStepBC * y2;
        x2 -= xStepAC * y2;
        y2 = 0;
      }
      x0 <<= 0x10;
      if (y0 < 0) {
        x0 -= xStepAB * y0;
        y0 = 0;
      }
      if (xStepBC < xStepAC) {
        y1 -= y0;
        y0 -= y2;
        y2 = y2 * width;
        while (true) {
          y0--;
          if (y0 < 0) {
            while (true) {
              y1--;
              if (y1 < 0) {
                return;
              }
              rasterScanline(x1 >> 16, x0 >> 16, y2, color);
              x1 += xStepBC;
              x0 += xStepAB;
              y2 += width;
            }
          }
          rasterScanline(x1 >> 16, x2 >> 16, y2, color);
          x1 += xStepBC;
          x2 += xStepAC;
          y2 += width;
        }
      } else {
        y1 -= y0;
        y0 -= y2;
        y2 = y2 * width;
        while (true) {
          y0--;
          if (y0 < 0) {
            while (true) {
              y1--;
              if (y1 < 0) {
                return;
              }
              rasterScanline(x0 >> 16, x1 >> 16, y2, color);
              x1 += xStepBC;
              x0 += xStepAB;
              y2 += width;
            }
          }
          rasterScanline(x2 >> 16, x1 >> 16, y2, color);
          x1 += xStepBC;
          x2 += xStepAC;
          y2 += width;
        }
      }
    } else {
      x2 <<= 0x10;
      x0 = x2;
      if (y2 < 0) {
        x0 -= xStepBC * y2;
        x2 -= xStepAC * y2;
        y2 = 0;
      }
      x1 <<= 0x10;
      if (y1 < 0) {
        x1 -= xStepAB * y1;
        y1 = 0;
      }
      if (xStepBC < xStepAC) {
        y0 -= y1;
        y1 -= y2;
        y2 = y2 * width;
        while (true) {
          y1--;
          if (y1 < 0) {
            while (true) {
              y0--;
              if (y0 < 0) {
                return;
              }
              rasterScanline(x1 >> 16, x2 >> 16, y2, color);
              x1 += xStepAB;
              x2 += xStepAC;
              y2 += width;
            }
          }
          rasterScanline(x0 >> 16, x2 >> 16, y2, color);
          x0 += xStepBC;
          x2 += xStepAC;
          y2 += width;
        }
      } else {
        y0 -= y1;
        y1 -= y2;
        y2 = y2 * width;
        while (true) {
          y1--;
          if (y1 < 0) {
            while (true) {
              y0--;
              if (y0 < 0) {
                return;
              }
              rasterScanline(x2 >> 16, x1 >> 16, y2, color);
              x1 += xStepAB;
              x2 += xStepAC;
              y2 += width;
            }
          }
          rasterScanline(x2 >> 16, x0 >> 16, y2, color);
          x0 += xStepBC;
          x2 += xStepAC;
          y2 += width;
        }
      }
    }
  }
}

fn rasterScanline(x0In: i32, x1In: i32, offsetIn: i32, rgbIn: u32) {
  var x0 = x0In;
  var x1 = x1In;
  var offset = offsetIn;
  var rgb = rgbIn;
  if (clipX) {
    if (x1 > boundX) {
      x1 = boundX;
    }
    if (x0 < 0) {
      x0 = 0;
    }
  }  
  if (x0 >= x1) {
    return;
  }  
  offset += x0;  
  var length = x1 - x0;
  if (writeDepth) {
    for (var x = 0; x < length; x++) {
      atomicMax(&depthBuffer[offset + x], depth);
    }
  } else if (alpha == 0) {
    for (var x = 0; x < length; x++) {
      setPixel(offset + x, rgb);
    }
  } else {
    length >>= 2;
    let alpha = alpha;
    let invAlpha = 256 - alpha;
    rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);
    var blendRgb: u32;
    while (true) {
      length--;
      if (length < 0) {
        length = (x1 - x0) & 0x3;
        if (length > 0) {
          while (true) {
            blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
            setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
            offset++;
            length--;
            if (length <= 0) {
              break;
            }
          }
        }
        break;
      }
      blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
      setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
      offset++;
      blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
      setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
      offset++;
      blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
      setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
      offset++;
      blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
      setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
      offset++;
    }
  }
}

fn rasterGouraudTriangle(xAIn: i32, xBIn: i32, xCIn: i32, yAIn: i32, yBIn: i32, yCIn: i32, colorAIn: i32, colorBIn: i32, colorCIn: i32) {
  var xA = xAIn;
  var xB = xBIn;
  var xC = xCIn;
  var yA = yAIn;
  var yB = yBIn;
  var yC = yCIn;
  var colorA = colorAIn;
  var colorB = colorBIn;
  var colorC = colorCIn;
  clipX = xA < 0 || xB < 0 || xC < 0 || xA > boundX || xB > boundX || xC > boundX;
  var xStepAB: i32;
  var colorStepAB: i32;
  if (yB != yA) {
    xStepAB = ((xB - xA) << 16) / (yB - yA);
    colorStepAB = ((colorB - colorA) << 15) / (yB - yA);
  }
  var xStepBC: i32;
  var colorStepBC: i32;
  if (yC != yB) {
    xStepBC = ((xC - xB) << 16) / (yC - yB);
    colorStepBC = ((colorC - colorB) << 15) / (yC - yB);
  }
  var xStepAC: i32;
  var colorStepAC: i32;
  if (yC != yA) {
    xStepAC = ((xA - xC) << 16) / (yA - yC);
    colorStepAC = ((colorA - colorC) << 15) / (yA - yC);
  }

  if (yA <= yB && yA <= yC) {
    if (yA < boundBottom) {
      if (yB > boundBottom) {
        yB = boundBottom;
      }
      if (yC > boundBottom) {
        yC = boundBottom;
      }
      if (yB < yC) {
        xA <<= 0x10;
        xC = xA;
        colorA <<= 0xf;
        colorC = colorA;
        if (yA < 0) {
          xC -= xStepAC * yA;
          xA -= xStepAB * yA;
          colorC -= colorStepAC * yA;
          colorA -= colorStepAB * yA;
          yA = 0;
        }
        xB <<= 0x10;
        colorB <<= 0xf;
        if (yB < 0) {
          xB -= xStepBC * yB;
          colorB -= colorStepBC * yB;
          yB = 0;
        }
        if ((yA != yB && xStepAC < xStepAB) || (yA == yB && xStepAC > xStepBC)) {
          yC -= yB;
          yB -= yA;
          yA = yA * width;
          while (true) {
            yB--;
            if (yB < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, yA);
                xC += xStepAC;
                xB += xStepBC;
                colorC += colorStepAC;
                colorB += colorStepBC;
                yA += width;
              }
            }
            rasterGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, yA);
            xC += xStepAC;
            xA += xStepAB;
            colorC += colorStepAC;
            colorA += colorStepAB;
            yA += width;
          }
        } else {
          yC -= yB;
          yB -= yA;
          yA = yA * width;
          while (true) {
            yB--;
            if (yB < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, yA);
                xC += xStepAC;
                xB += xStepBC;
                colorC += colorStepAC;
                colorB += colorStepBC;
                yA += width;
              }
            }
            rasterGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, yA);
            xC += xStepAC;
            xA += xStepAB;
            colorC += colorStepAC;
            colorA += colorStepAB;
            yA += width;
          }
        }
      } else {
        xA <<= 0x10;
        xB = xA;
        colorA <<= 0xf;
        colorB = colorA;
        if (yA < 0) {
          xB -= xStepAC * yA;
          xA -= xStepAB * yA;
          colorB -= colorStepAC * yA;
          colorA -= colorStepAB * yA;
          yA = 0;
        }
        xC <<= 0x10;
        colorC <<= 0xf;
        if (yC < 0) {
          xC -= xStepBC * yC;
          colorC -= colorStepBC * yC;
          yC = 0;
        }
        if ((yA != yC && xStepAC < xStepAB) || (yA == yC && xStepBC > xStepAB)) {
          yB -= yC;
          yC -= yA;
          yA = yA * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yB--;
                if (yB < 0) {
                  return;
                }
                rasterGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, yA);
                xC += xStepBC;
                xA += xStepAB;
                colorC += colorStepBC;
                colorA += colorStepAB;
                yA += width;
              }
            }
            rasterGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, yA);
            xB += xStepAC;
            xA += xStepAB;
            colorB += colorStepAC;
            colorA += colorStepAB;
            yA += width;
          }
        } else {
          yB -= yC;
          yC -= yA;
          yA = yA * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yB--;
                if (yB < 0) {
                  return;
                }
                rasterGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, yA);
                xC += xStepBC;
                xA += xStepAB;
                colorC += colorStepBC;
                colorA += colorStepAB;
                yA += width;
              }
            }
            rasterGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, yA);
            xB += xStepAC;
            xA += xStepAB;
            colorB += colorStepAC;
            colorA += colorStepAB;
            yA += width;
          }
        }
      }
    }
  } else if (yB <= yC) {
    if (yB < boundBottom) {
      if (yC > boundBottom) {
        yC = boundBottom;
      }
      if (yA > boundBottom) {
        yA = boundBottom;
      }
      if (yC < yA) {
        xB <<= 0x10;
        xA = xB;
        colorB <<= 0xf;
        colorA = colorB;
        if (yB < 0) {
          xA -= xStepAB * yB;
          xB -= xStepBC * yB;
          colorA -= colorStepAB * yB;
          colorB -= colorStepBC * yB;
          yB = 0;
        }
        xC <<= 0x10;
        colorC <<= 0xf;
        if (yC < 0) {
          xC -= xStepAC * yC;
          colorC -= colorStepAC * yC;
          yC = 0;
        }
        if ((yB != yC && xStepAB < xStepBC) || (yB == yC && xStepAB > xStepAC)) {
          yA -= yC;
          yC -= yB;
          yB = yB * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yA--;
                if (yA < 0) {
                  return;
                }
                rasterGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, yB);
                xA += xStepAB;
                xC += xStepAC;
                colorA += colorStepAB;
                colorC += colorStepAC;
                yB += width;
              }
            }
            rasterGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, yB);
            xA += xStepAB;
            xB += xStepBC;
            colorA += colorStepAB;
            colorB += colorStepBC;
            yB += width;
          }
        } else {
          yA -= yC;
          yC -= yB;
          yB = yB * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yA--;
                if (yA < 0) {
                  return;
                }
                rasterGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, yB);
                xA += xStepAB;
                xC += xStepAC;
                colorA += colorStepAB;
                colorC += colorStepAC;
                yB += width;
              }
            }
            rasterGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, yB);
            xA += xStepAB;
            xB += xStepBC;
            colorA += colorStepAB;
            colorB += colorStepBC;
            yB += width;
          }
        }
      } else {
        xB <<= 0x10;
        xC = xB;
        colorB <<= 0xf;
        colorC = colorB;
        if (yB < 0) {
          xC -= xStepAB * yB;
          xB -= xStepBC * yB;
          colorC -= colorStepAB * yB;
          colorB -= colorStepBC * yB;
          yB = 0;
        }
        xA <<= 0x10;
        colorA <<= 0xf;
        if (yA < 0) {
          xA -= xStepAC * yA;
          colorA -= colorStepAC * yA;
          yA = 0;
        }
        yC -= yA;
        yA -= yB;
        yB = yB * width;
        if (xStepAB < xStepBC) {
          while (true) {
            yA--;
            if (yA < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, yB);
                xA += xStepAC;
                xB += xStepBC;
                colorA += colorStepAC;
                colorB += colorStepBC;
                yB += width;
              }
            }
            rasterGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, yB);
            xC += xStepAB;
            xB += xStepBC;
            colorC += colorStepAB;
            colorB += colorStepBC;
            yB += width;
          }
        } else {
          while (true) {
            yA--;
            if (yA < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, yB);
                xA += xStepAC;
                xB += xStepBC;
                colorA += colorStepAC;
                colorB += colorStepBC;
                yB += width;
              }
            }
            rasterGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, yB);
            xC += xStepAB;
            xB += xStepBC;
            colorC += colorStepAB;
            colorB += colorStepBC;
            yB += width;
          }
        }
      }
    }
  } else if (yC < boundBottom) {
    if (yA > boundBottom) {
      yA = boundBottom;
    }
    if (yB > boundBottom) {
      yB = boundBottom;
    }
    if (yA < yB) {
      xC <<= 0x10;
      xB = xC;
      colorC <<= 0xf;
      colorB = colorC;
      if (yC < 0) {
        xB -= xStepBC * yC;
        xC -= xStepAC * yC;
        colorB -= colorStepBC * yC;
        colorC -= colorStepAC * yC;
        yC = 0;
      }
      xA <<= 0x10;
      colorA <<= 0xf;
      if (yA < 0) {
        xA -= xStepAB * yA;
        colorA -= colorStepAB * yA;
        yA = 0;
      }
      yB -= yA;
      yA -= yC;
      yC = yC * width;
      if (xStepBC < xStepAC) {
        while (true) {
          yA--;
          if (yA < 0) {
            while (true) {
              yB--;
              if (yB < 0) {
                return;
              }
              rasterGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, yC);
              xB += xStepBC;
              xA += xStepAB;
              colorB += colorStepBC;
              colorA += colorStepAB;
              yC += width;
            }
          }
          rasterGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, yC);
          xB += xStepBC;
          xC += xStepAC;
          colorB += colorStepBC;
          colorC += colorStepAC;
          yC += width;
        }
      } else {
        while (true) {
          yA--;
          if (yA < 0) {
            while (true) {
              yB--;
              if (yB < 0) {
                return;
              }
              rasterGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, yC);
              xB += xStepBC;
              xA += xStepAB;
              colorB += colorStepBC;
              colorA += colorStepAB;
              yC += width;
            }
          }
          rasterGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, yC);
          xB += xStepBC;
          xC += xStepAC;
          colorB += colorStepBC;
          colorC += colorStepAC;
          yC += width;
        }
      }
    } else {
      xC <<= 0x10;
      xA = xC;
      colorC <<= 0xf;
      colorA = colorC;
      if (yC < 0) {
        xA -= xStepBC * yC;
        xC -= xStepAC * yC;
        colorA -= colorStepBC * yC;
        colorC -= colorStepAC * yC;
        yC = 0;
      }
      xB <<= 0x10;
      colorB <<= 0xf;
      if (yB < 0) {
        xB -= xStepAB * yB;
        colorB -= colorStepAB * yB;
        yB = 0;
      }
      yA -= yB;
      yB -= yC;
      yC = yC * width;
      if (xStepBC < xStepAC) {
        while (true) {
          yB--;
          if (yB < 0) {
            while (true) {
              yA--;
              if (yA < 0) {
                return;
              }
              rasterGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, yC);
              xB += xStepAB;
              xC += xStepAC;
              colorB += colorStepAB;
              colorC += colorStepAC;
              yC += width;
            }
          }
          rasterGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, yC);
          xA += xStepBC;
          xC += xStepAC;
          colorA += colorStepBC;
          colorC += colorStepAC;
          yC += width;
        }
      } else {
        while (true) {
          yB--;
          if (yB < 0) {
            while (true) {
              yA--;
              if (yA < 0) {
                return;
              }
              rasterGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, yC);
              xB += xStepAB;
              xC += xStepAC;
              colorB += colorStepAB;
              colorC += colorStepAC;
              yC += width;
            }
          }
          rasterGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, yC);
          xA += xStepBC;
          xC += xStepAC;
          colorA += colorStepBC;
          colorC += colorStepAC;
          yC += width;
        }
      }
    }
  }
}

fn rasterGouraudScanline(x0In: i32, x1In: i32, color0In: i32, color1: i32, offsetIn: i32) {
  var x0 = x0In;
  var x1 = x1In;
  var color0 = color0In;
  var offset = offsetIn;

  var rgb: u32;
  if (jagged) {
    var colorStep: i32;
    var length: i32;

    if (clipX) {
      if (x1 - x0 > 3) {
        colorStep = ((color1 - color0) / (x1 - x0));
      } else {
        colorStep = 0;
      }
      if (x1 > boundX) {
        x1 = boundX;
      }
      if (x0 < 0) {
        color0 -= x0 * colorStep;
        x0 = 0;
      }
      if (x0 >= x1) {
        return;
      }
      offset += x0;
      length = (x1 - x0) >> 2;
      colorStep <<= 0x2;
    } else if (x0 < x1) {
      offset += x0;
      length = (x1 - x0) >> 2;
      if (length > 0) {
        colorStep = ((color1 - color0) * reciprocal15(length)) >> 15;
      } else {
        colorStep = 0;
      }
    } else {
      return;
    }
    
    if (alpha == 0) {
      while (true) {
        length--;
        if (length < 0) {
          length = (x1 - x0) & 0x3;
          if (length > 0) {
            rgb = luts.palette[color0 >> 8];
            while (true) {
              setPixel(offset, rgb);
              offset++;
              length--;
              if (length <= 0) {
                break;
              }
            }
            return;
          }
          break;
        }
        rgb = luts.palette[color0 >> 8];
        color0 += colorStep;
        setPixel(offset, rgb);
        offset++;
        setPixel(offset, rgb);
        offset++;
        setPixel(offset, rgb);
        offset++;
        setPixel(offset, rgb);
        offset++;
      }
    } else {
      let alpha = alpha;
      let invAlpha = 256 - alpha;
      var blendRgb: u32;
      while (true) {
        length--;
        if (length < 0) {
          length = (x1 - x0) & 0x3;
          if (length > 0) {
            rgb = luts.palette[color0 >> 8];
            rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);
            while (true) {
              blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
              setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
              offset++;
              length--;
              if (length <= 0) {
                break;
              }
            }
          }
          break;
        }
        rgb = luts.palette[color0 >> 8];
        color0 += colorStep;
        rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);
        blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
        setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
        offset++;
        blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
        setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
        offset++;
        blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
        setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
        offset++;
        blendRgb = pixelBuffer.data[offset + i32(atomicLoad(&depthBuffer[offset + 1]) < depth)];
        setPixel(offset, rgb + ((((blendRgb & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((blendRgb & 0xff00) * alpha) >> 8) & 0xff00));
        offset++;
      }
    }
  }
}

fn rasterTexturedTriangle(
  xAIn: i32,
  xBIn: i32,
  xCIn: i32,
  yAIn: i32,
  yBIn: i32,
  yCIn: i32,
  shadeAIn: i32,
  shadeBIn: i32,
  shadeCIn: i32,
  originXIn: i32,
  originYIn: i32,
  originZIn: i32,
  txBIn: i32,
  txCIn: i32,
  tyBIn: i32,
  tyCIn: i32,
  tzBIn: i32,
  tzCIn: i32,
  textureId: i32
) {
  var xA = xAIn;
  var xB = xBIn;
  var xC = xCIn;
  var yA = yAIn;
  var yB = yBIn;
  var yC = yCIn;
  var shadeA = shadeAIn;
  var shadeB = shadeBIn;
  var shadeC = shadeCIn;
  var originX = originXIn;
  var originY = originYIn;
  var originZ = originZIn;
  var txB = txBIn;
  var txC = txCIn;
  var tyB = tyBIn;
  var tyC = tyCIn;
  var tzB = tzBIn;
  var tzC = tzCIn;
  let texels = &luts.textures[textureId];
  opaqueTexture = luts.texturesTranslucent[textureId] == 0;
  clipX = xA < 0 || xB < 0 || xC < 0 || xA > boundX || xB > boundX || xC > boundX;

  let verticalX = originX - txB;
  let verticalY = originY - tyB;
  let verticalZ = originZ - tzB;

  let horizontalX = txC - originX;
  let horizontalY = tyC - originY;
  let horizontalZ = tzC - originZ;

  var u = (horizontalX * originY - horizontalY * originX) << 14;
  let uStride = (horizontalY * originZ - horizontalZ * originY) << 8;
  let uStepVertical = (horizontalZ * originX - horizontalX * originZ) << 5;

  var v = (verticalX * originY - verticalY * originX) << 14;
  let vStride = (verticalY * originZ - verticalZ * originY) << 8;
  let vStepVertical = (verticalZ * originX - verticalX * originZ) << 5;

  var w = (verticalY * horizontalX - verticalX * horizontalY) << 14;
  let wStride = (verticalZ * horizontalY - verticalY * horizontalZ) << 8;
  let wStepVertical = (verticalX * horizontalZ - verticalZ * horizontalX) << 5;

  var xStepAB = 0;
  var shadeStepAB = 0;
  if (yB != yA) {
    xStepAB = (((xB - xA) << 16) / (yB - yA));
    shadeStepAB = (((shadeB - shadeA) << 16) / (yB - yA));
  }

  var xStepBC = 0;
  var shadeStepBC = 0;
  if (yC != yB) {
    xStepBC = (((xC - xB) << 16) / (yC - yB));
    shadeStepBC = (((shadeC - shadeB) << 16) / (yC - yB));
  }

  var xStepAC = 0;
  var shadeStepAC = 0;
  if (yC != yA) {
    xStepAC = (((xA - xC) << 16) / (yA - yC));
    shadeStepAC = (((shadeA - shadeC) << 16) / (yA - yC));
  }

  if (yA <= yB && yA <= yC) {
    if (yA < boundBottom) {
      if (yB > boundBottom) {
        yB = boundBottom;
      }
  
      if (yC > boundBottom) {
        yC = boundBottom;
      }
  
      if (yB < yC) {
        xA <<= 0x10;
        xC = xA;
        shadeA <<= 0x10;
        shadeC = shadeA;
        if (yA < 0) {
          xC -= xStepAC * yA;
          xA -= xStepAB * yA;
          shadeC -= shadeStepAC * yA;
          shadeA -= shadeStepAB * yA;
          yA = 0;
        }
        xB <<= 0x10;
        shadeB <<= 0x10;
        if (yB < 0) {
          xB -= xStepBC * yB;
          shadeB -= shadeStepBC * yB;
          yB = 0;
        }
        let dy = yA - centerY;
        u += uStepVertical * dy;
        v += vStepVertical * dy;
        w += wStepVertical * dy;
        if ((yA != yB && xStepAC < xStepAB) || (yA == yB && xStepAC > xStepBC)) {
          yC -= yB;
          yB -= yA;
          yA = yA * width;
          while (true) {
            yB--;
            if (yB < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterTexturedScanline(xC >> 16, xB >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
                xC += xStepAC;
                xB += xStepBC;
                shadeC += shadeStepAC;
                shadeB += shadeStepBC;
                yA += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xC >> 16, xA >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
            xC += xStepAC;
            xA += xStepAB;
            shadeC += shadeStepAC;
            shadeA += shadeStepAB;
            yA += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        } else {
          yC -= yB;
          yB -= yA;
          yA = yA * width;
          while (true) {
            yB--;
            if (yB < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterTexturedScanline(xB >> 16, xC >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
                xC += xStepAC;
                xB += xStepBC;
                shadeC += shadeStepAC;
                shadeB += shadeStepBC;
                yA += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xA >> 16, xC >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
            xC += xStepAC;
            xA += xStepAB;
            shadeC += shadeStepAC;
            shadeA += shadeStepAB;
            yA += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        }
      } else {
        xA <<= 0x10;
        xB = xA;
        shadeA <<= 0x10;
        shadeB = shadeA;
        if (yA < 0) {
          xB -= xStepAC * yA;
          xA -= xStepAB * yA;
          shadeB -= shadeStepAC * yA;
          shadeA -= shadeStepAB * yA;
          yA = 0;
        }
        xC <<= 0x10;
        shadeC <<= 0x10;
        if (yC < 0) {
          xC -= xStepBC * yC;
          shadeC -= shadeStepBC * yC;
          yC = 0;
        }
        let dy = yA - centerY;
        u += uStepVertical * dy;
        v += vStepVertical * dy;
        w += wStepVertical * dy;
        if ((yA == yC || xStepAC >= xStepAB) && (yA != yC || xStepBC <= xStepAB)) {
          yB -= yC;
          yC -= yA;
          yA = yA * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yB--;
                if (yB < 0) {
                  return;
                }
                rasterTexturedScanline(xA >> 16, xC >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
                xC += xStepBC;
                xA += xStepAB;
                shadeC += shadeStepBC;
                shadeA += shadeStepAB;
                yA += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xA >> 16, xB >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
            xB += xStepAC;
            xA += xStepAB;
            shadeB += shadeStepAC;
            shadeA += shadeStepAB;
            yA += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        } else {
          yB -= yC;
          yC -= yA;
          yA = yA * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yB--;
                if (yB < 0) {
                  return;
                }
                rasterTexturedScanline(xC >> 16, xA >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
                xC += xStepBC;
                xA += xStepAB;
                shadeC += shadeStepBC;
                shadeA += shadeStepAB;
                yA += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xB >> 16, xA >> 16, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
            xB += xStepAC;
            xA += xStepAB;
            shadeB += shadeStepAC;
            shadeA += shadeStepAB;
            yA += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        }
      }
    }
  } else if (yB <= yC) {
    if (yB < boundBottom) {
      if (yC > boundBottom) {
        yC = boundBottom;
      }
      if (yA > boundBottom) {
        yA = boundBottom;
      }
      if (yC < yA) {
        xB <<= 0x10;
        xA = xB;
        shadeB <<= 0x10;
        shadeA = shadeB;
        if (yB < 0) {
          xA -= xStepAB * yB;
          xB -= xStepBC * yB;
          shadeA -= shadeStepAB * yB;
          shadeB -= shadeStepBC * yB;
          yB = 0;
        }
        xC <<= 0x10;
        shadeC <<= 0x10;
        if (yC < 0) {
          xC -= xStepAC * yC;
          shadeC -= shadeStepAC * yC;
          yC = 0;
        }
        let dy = yB - centerY;
        u += uStepVertical * dy;
        v += vStepVertical * dy;
        w += wStepVertical * dy;
        if ((yB != yC && xStepAB < xStepBC) || (yB == yC && xStepAB > xStepAC)) {
          yA -= yC;
          yC -= yB;
          yB = yB * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yA--;
                if (yA < 0) {
                  return;
                }
                rasterTexturedScanline(xA >> 16, xC >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
                xA += xStepAB;
                xC += xStepAC;
                shadeA += shadeStepAB;
                shadeC += shadeStepAC;
                yB += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xA >> 16, xB >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
            xA += xStepAB;
            xB += xStepBC;
            shadeA += shadeStepAB;
            shadeB += shadeStepBC;
            yB += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        } else {
          yA -= yC;
          yC -= yB;
          yB = yB * width;
          while (true) {
            yC--;
            if (yC < 0) {
              while (true) {
                yA--;
                if (yA < 0) {
                  return;
                }
                rasterTexturedScanline(xC >> 16, xA >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
                xA += xStepAB;
                xC += xStepAC;
                shadeA += shadeStepAB;
                shadeC += shadeStepAC;
                yB += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xB >> 16, xA >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
            xA += xStepAB;
            xB += xStepBC;
            shadeA += shadeStepAB;
            shadeB += shadeStepBC;
            yB += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        }
      } else {
        xB <<= 0x10;
        xC = xB;
        shadeB <<= 0x10;
        shadeC = shadeB;
        if (yB < 0) {
          xC -= xStepAB * yB;
          xB -= xStepBC * yB;
          shadeC -= shadeStepAB * yB;
          shadeB -= shadeStepBC * yB;
          yB = 0;
        }
        xA <<= 0x10;
        shadeA <<= 0x10;
        if (yA < 0) {
          xA -= xStepAC * yA;
          shadeA -= shadeStepAC * yA;
          yA = 0;
        }
        let dy = yB - centerY;
        u += uStepVertical * dy;
        v += vStepVertical * dy;
        w += wStepVertical * dy;
        yC -= yA;
        yA -= yB;
        yB = yB * width;
        if (xStepAB < xStepBC) {
          while (true) {
            yA--;
            if (yA < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterTexturedScanline(xA >> 16, xB >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
                xA += xStepAC;
                xB += xStepBC;
                shadeA += shadeStepAC;
                shadeB += shadeStepBC;
                yB += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xC >> 16, xB >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
            xC += xStepAB;
            xB += xStepBC;
            shadeC += shadeStepAB;
            shadeB += shadeStepBC;
            yB += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        } else {
          while (true) {
            yA--;
            if (yA < 0) {
              while (true) {
                yC--;
                if (yC < 0) {
                  return;
                }
                rasterTexturedScanline(xB >> 16, xA >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
                xA += xStepAC;
                xB += xStepBC;
                shadeA += shadeStepAC;
                shadeB += shadeStepBC;
                yB += width;
                u += uStepVertical;
                v += vStepVertical;
                w += wStepVertical;
              }
            }
            rasterTexturedScanline(xB >> 16, xC >> 16, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
            xC += xStepAB;
            xB += xStepBC;
            shadeC += shadeStepAB;
            shadeB += shadeStepBC;
            yB += width;
            u += uStepVertical;
            v += vStepVertical;
            w += wStepVertical;
          }
        }
      }
    }
  } else if (yC < boundBottom) {
    if (yA > boundBottom) {
      yA = boundBottom;
    }
    if (yB > boundBottom) {
      yB = boundBottom;
    }
    if (yA < yB) {
      xC <<= 0x10;
      xB = xC;
      shadeC <<= 0x10;
      shadeB = shadeC;
      if (yC < 0) {
        xB -= xStepBC * yC;
        xC -= xStepAC * yC;
        shadeB -= shadeStepBC * yC;
        shadeC -= shadeStepAC * yC;
        yC = 0;
      }
      xA <<= 0x10;
      shadeA <<= 0x10;
      if (yA < 0) {
        xA -= xStepAB * yA;
        shadeA -= shadeStepAB * yA;
        yA = 0;
      }
      let dy = yC - centerY;
      u += uStepVertical * dy;
      v += vStepVertical * dy;
      w += wStepVertical * dy;
      yB -= yA;
      yA -= yC;
      yC = yC * width;
      if (xStepBC < xStepAC) {
        while (true) {
          yA--;
          if (yA < 0) {
            while (true) {
              yB--;
              if (yB < 0) {
                return;
              }
              rasterTexturedScanline(xB >> 16, xA >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
              xB += xStepBC;
              xA += xStepAB;
              shadeB += shadeStepBC;
              shadeA += shadeStepAB;
              yC += width;
              u += uStepVertical;
              v += vStepVertical;
              w += wStepVertical;
            }
          }
          rasterTexturedScanline(xB >> 16, xC >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
          xB += xStepBC;
          xC += xStepAC;
          shadeB += shadeStepBC;
          shadeC += shadeStepAC;
          yC += width;
          u += uStepVertical;
          v += vStepVertical;
          w += wStepVertical;
        }
      } else {
        while (true) {
          yA--;
          if (yA < 0) {
            while (true) {
              yB--;
              if (yB < 0) {
                return;
              }
              rasterTexturedScanline(xA >> 16, xB >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
              xB += xStepBC;
              xA += xStepAB;
              shadeB += shadeStepBC;
              shadeA += shadeStepAB;
              yC += width;
              u += uStepVertical;
              v += vStepVertical;
              w += wStepVertical;
            }
          }
          rasterTexturedScanline(xC >> 16, xB >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
          xB += xStepBC;
          xC += xStepAC;
          shadeB += shadeStepBC;
          shadeC += shadeStepAC;
          yC += width;
          u += uStepVertical;
          v += vStepVertical;
          w += wStepVertical;
        }
      }
    } else {
      xC <<= 0x10;
      xA = xC;
      shadeC <<= 0x10;
      shadeA = shadeC;
      if (yC < 0) {
        xA -= xStepBC * yC;
        xC -= xStepAC * yC;
        shadeA -= shadeStepBC * yC;
        shadeC -= shadeStepAC * yC;
        yC = 0;
      }
      xB <<= 0x10;
      shadeB <<= 0x10;
      if (yB < 0) {
        xB -= xStepAB * yB;
        shadeB -= shadeStepAB * yB;
        yB = 0;
      }
      let dy = yC - centerY;
      u += uStepVertical * dy;
      v += vStepVertical * dy;
      w += wStepVertical * dy;
      yA -= yB;
      yB -= yC;
      yC = yC * width;
      if (xStepBC < xStepAC) {
        while (true) {
          yB--;
          if (yB < 0) {
            while (true) {
              yA--;
              if (yA < 0) {
                return;
              }
              rasterTexturedScanline(xB >> 16, xC >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
              xB += xStepAB;
              xC += xStepAC;
              shadeB += shadeStepAB;
              shadeC += shadeStepAC;
              yC += width;
              u += uStepVertical;
              v += vStepVertical;
              w += wStepVertical;
            }
          }
          rasterTexturedScanline(xA >> 16, xC >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
          xA += xStepBC;
          xC += xStepAC;
          shadeA += shadeStepBC;
          shadeC += shadeStepAC;
          yC += width;
          u += uStepVertical;
          v += vStepVertical;
          w += wStepVertical;
        }
      } else {
        while (true) {
          yB--;
          if (yB < 0) {
            while (true) {
              yA--;
              if (yA < 0) {
                return;
              }
              rasterTexturedScanline(xC >> 16, xB >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
              xB += xStepAB;
              xC += xStepAC;
              shadeB += shadeStepAB;
              shadeC += shadeStepAC;
              yC += width;
              u += uStepVertical;
              v += vStepVertical;
              w += wStepVertical;
            }
          }
          rasterTexturedScanline(xC >> 16, xA >> 16, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
          xA += xStepBC;
          xC += xStepAC;
          shadeA += shadeStepBC;
          shadeC += shadeStepAC;
          yC += width;
          u += uStepVertical;
          v += vStepVertical;
          w += wStepVertical;
        }
      }
    }
  }
}

fn rasterTexturedScanline(
  xAIn: i32, 
  xBIn: i32, 
  offsetIn: i32, 
  texels: ptr<storage, array<u32, 65536>>, 
  curUIn: i32, 
  curVIn: i32, 
  uIn: i32, 
  vIn: i32, 
  wIn: i32, 
  uStride: i32, 
  vStride: i32, 
  wStride: i32, 
  shadeAIn: i32, 
  shadeBIn: i32
) {
  var xA = xAIn;
  var xB = xBIn;
  var offset = offsetIn;
  var curU = curUIn;
  var curV = curVIn;
  var u = uIn;
  var v = vIn;
  var w = wIn;
  var shadeA = shadeAIn;
  var shadeB = shadeBIn;
  if (xA >= xB) {
      return;
  } 
  var shadeStrides: i32;
  var strides: i32;
  if (clipX) {
    shadeStrides = ((shadeB - shadeA) / (xB - xA));   
    if (xB > boundX) {
      xB = boundX;
    }   
    if (xA < 0) {
      shadeA -= xA * shadeStrides;
      xA = 0;
    }   
    if (xA >= xB) {
      return;
    }   
    strides = (xB - xA) >> 3;
    shadeStrides <<= 0xc;
  } else {
    if (xB - xA > 7) {
      strides = (xB - xA) >> 3;
      shadeStrides = ((shadeB - shadeA) * reciprocal15(strides)) >> 6;
    } else {
      strides = 0;
      shadeStrides = 0;
    }
  }

  shadeA <<= 0x9;
  offset += xA;

  var nextU = 0;
  var nextV = 0;
  var dx = xA - centerX;
  u = u + (uStride >> 3) * dx;
  v = v + (vStride >> 3) * dx;
  w = w + (wStride >> 3) * dx;
  var curW = w >> 14;
  if (curW != 0) {
    curU = (u / curW);
    curV = (v / curW);
    if (curU < 0) {
      curU = 0;
    } else if (curU > 16256) {
      curU = 16256;
    }
  }
  u = u + uStride;
  v = v + vStride;
  w = w + wStride;
  curW = w >> 14;
  if (curW != 0) {
    nextU = (u / curW);
    nextV = (v / curW);
    if (nextU < 7) {
      nextU = 7;
    } else if (nextU > 16256) {
      nextU = 16256;
    }
  }
  var stepU = (nextU - curU) >> 3;
  var stepV = (nextV - curV) >> 3;
  curU += shadeA & 0x600000;
  var shadeShift = u32(shadeA >> 23);
  if (writeDepth) {
    while (strides > 0) {
      strides--;
      var rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset = offset + 1;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU = nextU;
      curV = nextV;
      u += uStride;
      v += vStride;
      w += wStride;
      curW = w >> 14;
      if (curW != 0) {
        nextU = (u / curW);
        nextV = (v / curW);
        if (nextU < 7) {
          nextU = 7;
        } else if (nextU > 16256) {
          nextU = 16256;
        }
      }
      stepU = (nextU - curU) >> 3;
      stepV = (nextV - curV) >> 3;
      shadeA += shadeStrides;
      curU += shadeA & 0x600000;
      shadeShift = u32(shadeA >> 23);
    }
    strides = (xB - xA) & 0x7;
    while (strides > 0) {
      strides--;
      var rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        atomicMax(&depthBuffer[offset], depth);
      }
      offset++;
      curU += stepU;
      curV += stepV;
    }
  } else if (opaqueTexture) {
    while (strides > 0) {
      strides--;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU = nextU;
      curV = nextV;
      u += uStride;
      v += vStride;
      w += wStride;
      curW = w >> 14;
      if (curW != 0) {
        nextU = (u / curW);
        nextV = (v / curW);
        if (nextU < 7) {
          nextU = 7;
        } else if (nextU > 16256) {
          nextU = 16256;
        }
      }
      stepU = (nextU - curU) >> 3;
      stepV = (nextV - curV) >> 3;
      shadeA += shadeStrides;
      curU += shadeA & 0x600000;
      shadeShift = u32(shadeA >> 23);
    }
    strides = (xB - xA) & 0x7;
    while (strides > 0) {
      strides--;
      setPixel(offset, texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift);
      offset++;
      curU += stepU;
      curV += stepV;
    }
  } else {
    while (strides > 0) {
      strides--;
      var rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset = offset + 1;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
      rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU = nextU;
      curV = nextV;
      u += uStride;
      v += vStride;
      w += wStride;
      curW = w >> 14;
      if (curW != 0) {
        nextU = (u / curW);
        nextV = (v / curW);
        if (nextU < 7) {
          nextU = 7;
        } else if (nextU > 16256) {
          nextU = 16256;
        }
      }
      stepU = (nextU - curU) >> 3;
      stepV = (nextV - curV) >> 3;
      shadeA += shadeStrides;
      curU += shadeA & 0x600000;
      shadeShift = u32(shadeA >> 23);
    }
    strides = (xB - xA) & 0x7;
    while (strides > 0) {
      strides--;
      var rgb = texels[(curV & 0x3f80) + (curU >> 7)] >> shadeShift;
      if (rgb != 0) {
        setPixel(offset, rgb);
      }
      offset++;
      curU += stepU;
      curV += stepV;
    }
  }
}

fn reciprocal15(value: i32) -> i32 {
  return 32768 / value;
}

fn reciprocal16(value: i32) -> i32 {
  return 65536 / value;
}
`;
