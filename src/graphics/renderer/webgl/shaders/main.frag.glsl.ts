import { hslToRgbFunction } from './commons.glsl';

export const SHADER_CODE: string = `
#version 300 es

precision highp float;
precision highp int;

flat in ivec3 xs;
flat in ivec3 ys;
flat in ivec3 colors;

out vec4 fragColor;

const vec2 vertices[3] = vec2[3](
    vec2(20, 200),
    vec2(400, 190),
    vec2(200, 20)
);

// const int colors[3] = int[3](
//     56255,
//     959,
//     22463
// );

const float brightness = 0.9;


const int width = 512;
const int height = 334;

const int boundBottom = height;

${hslToRgbFunction}

int reciprocal15(int value) {
    return 32768 / value;
}

bool isOutsideScanline(int xA, int xB) {
    return false;
    // int fragX = int(gl_FragCoord.x);
    // return fragX < xA || fragX >= xB || xA >= xB;
}

vec3 getScanlineColor(int xA, int xB, int colorA, int colorB) {
    int fragX = int(gl_FragCoord.x);
    if (fragX < xA || fragX >= xB) {
        // discard;
    }
    int colorStep;
    int length;
    if (xA < xB) {
        length = (xB - xA) >> 2;
        if (length > 0) {
            colorStep = (colorB - colorA) * reciprocal15(length) >> 15;
        }
    } else {
        // discard;
    }
    int scanlineX = fragX - xA;
    colorA += colorStep * (scanlineX >> 2);
    return hslToRgb(colorA >> 8, brightness);
}

void main() {
    // float x = v_barycentric.x * vertices[0].x + v_barycentric.y * vertices[1].x + v_barycentric.z * vertices[2].x;
    // float y = float(gl_FragCoord.y);
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // fragColor.r = x / 512.0;
    // fragColor.r = y / 255.0;
    int xA = xs.x;
    int xB = xs.y;
    int xC = xs.z;
    int yA = ys.x;
    int yB = ys.y;
    int yC = ys.z;
    int colorA = colors.x;
    int colorB = colors.y;
    int colorC = colors.z;

    // fragColor.rgb = hslToRgb(colorA, brightness);

    int minScanlineY = min(yA, min(yB, yC));
    int maxScanlineY = max(yA, max(yB, yC));
    int scanlineY = height - int(gl_FragCoord.y) - 1 - minScanlineY + 1;
    if (scanlineY < 0 || scanlineY > maxScanlineY - minScanlineY) {
        // discard;
    }
    // scanlineY++;
    // fragColor.r = float(scanlineY) / 255.0;

    int dxAB = xB - xA;
	int dyAB = yB - yA;
	int dxAC = xC - xA;
	int dyAC = yC - yA;

	int xStepAB = 0;
	int colorStepAB = 0;
	if (yB != yA) {
		xStepAB = (dxAB << 16) / dyAB;
        colorStepAB = ((colorB - colorA) << 15) / dyAB;
	}

	int xStepBC = 0;
	int colorStepBC = 0;
	if (yC != yB) {
        xStepBC = ((xC - xB) << 16) / (yC - yB);
        colorStepBC = ((colorC - colorB) << 15) / (yC - yB);
	}

	int xStepAC = 0;
	int colorStepAC = 0;
	if (yC != yA) {
        xStepAC = ((xA - xC) << 16) / (yA - yC);
        colorStepAC = ((colorA - colorC) << 15) / (yA - yC);
	}

    int currentScanline = 0;

	if (yA <= yB && yA <= yC) {
        if (yA < boundBottom) {
            if (yB > boundBottom) {
                yB = boundBottom;
            }

            if (yC > boundBottom) {
                yC = boundBottom;
            }

            if (yB < yC) {
                xC = xA <<= 16;
                colorC = colorA <<= 15;
                if (yA < 0) {
                    xC -= xStepAC * yA;
                    xA -= xStepAB * yA;
                    colorC -= colorStepAC * yA;
                    colorA -= colorStepAB * yA;
                    yA = 0;
                }

                xB <<= 16;
                colorB <<= 15;
                if (yB < 0) {
                    xB -= xStepBC * yB;
                    colorB -= colorStepBC * yB;
                    yB = 0;
                }

                if (yA != yB && xStepAC < xStepAB || yA == yB && xStepAC > xStepBC) {
                    yC -= yB;
                    yB -= yA;
                    // yA = lineOffset[yA];

                    while (--yB >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xC >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorA >> 7);
                            return;
                        }
                        // gouraudRaster(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, data, yA, 0);
                        xC += xStepAC;
                        xA += xStepAB;
                        colorC += colorStepAC;
                        colorA += colorStepAB;
                        // yA += width2d;
                        currentScanline++;
                    }
                    while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xC >> 16;
                            int scanlineXB = xB >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorB >> 7);
                            return;
                        }
                        // gouraudRaster(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, data, yA, 0);
                        xC += xStepAC;
                        xB += xStepBC;
                        colorC += colorStepAC;
                        colorB += colorStepBC;
                        // yA += width2d;
                        currentScanline++;
                    }
                } else {
                    yC -= yB;
                    yB -= yA;
                    // yA = lineOffset[yA];

                    while (--yB >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xC >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorC >> 7);
                            return;
                        }
                        // gouraudRaster(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, data, yA, 0);
                        xC += xStepAC;
                        xA += xStepAB;
                        colorC += colorStepAC;
                        colorA += colorStepAB;
                        // yA += width2d;
                        currentScanline++;
                    }
                    while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xB >> 16;
                            int scanlineXB = xC >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorC >> 7);
                            return;
                        }
                        // gouraudRaster(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, data, yA, 0);
                        xC += xStepAC;
                        xB += xStepBC;
                        colorC += colorStepAC;
                        colorB += colorStepBC;
                        // yA += width2d;
                        currentScanline++;
                    }
                }
            } else {
                xB = xA <<= 16;
                colorB = colorA <<= 15;
                if (yA < 0) {
                    xB -= xStepAC * yA;
                    xA -= xStepAB * yA;
                    colorB -= colorStepAC * yA;
                    colorA -= colorStepAB * yA;
                    yA = 0;
                }

                xC <<= 16;
                colorC <<= 15;
                if (yC < 0) {
                    xC -= xStepBC * yC;
                    colorC -= colorStepBC * yC;
                    yC = 0;
                }

                if (yA != yC && xStepAC < xStepAB || yA == yC && xStepBC > xStepAB) {
                    yB -= yC;
                    yC -= yA;
                    // yA = lineOffset[yA];

                    while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xB >> 16;
                            int scanlineXB = xA >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorA >> 7);
                            return;
                        }
                        // gouraudRaster(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, data, yA, 0);
                        xB += xStepAC;
                        xA += xStepAB;
                        colorB += colorStepAC;
                        colorA += colorStepAB;
                        // yA += width2d;
                        currentScanline++;
                    }
                    while (--yB >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xC >> 16;
                            int scanlineXB = xA >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorA >> 7);
                            return;
                        }
                        // gouraudRaster(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, data, yA, 0);
                        xC += xStepBC;
                        xA += xStepAB;
                        colorC += colorStepBC;
                        colorA += colorStepAB;
                        // yA += width2d;
                        currentScanline++;
                    }
                } else {
                    yB -= yC;
                    yC -= yA;
                    // yA = lineOffset[yA];

                    while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xB >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorB >> 7);
                            return;
                        }
                        // gouraudRaster(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, data, yA, 0);
                        xB += xStepAC;
                        xA += xStepAB;
                        colorB += colorStepAC;
                        colorA += colorStepAB;
                        // yA += width2d;
                        currentScanline++;
                    }
                    while (--yB >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xC >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorC >> 7);
                            return;
                        }
                        // gouraudRaster(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, data, yA, 0);
                        xC += xStepBC;
                        xA += xStepAB;
                        colorC += colorStepBC;
                        colorA += colorStepAB;
                        // yA += width2d;
                        currentScanline++;
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
				xA = xB <<= 16;
				colorA = colorB <<= 15;
				if (yB < 0) {
					xA -= xStepAB * yB;
					xB -= xStepBC * yB;
					colorA -= colorStepAB * yB;
					colorB -= colorStepBC * yB;
					yB = 0;
				}

				xC <<= 16;
				colorC <<= 15;
				if (yC < 0) {
					xC -= xStepAC * yC;
					colorC -= colorStepAC * yC;
					yC = 0;
				}

				if (yB != yC && xStepAB < xStepBC || yB == yC && xStepAB > xStepAC) {
					yA -= yC;
					yC -= yB;
					// yB = lineOffset[yB];

					while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xB >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorB >> 7);
                            return;
                        }
						// gouraudRaster(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, data, yB, 0);
						xA += xStepAB;
						xB += xStepBC;
						colorA += colorStepAB;
						colorB += colorStepBC;
						// yB += width2d;
                        currentScanline++;
					}
					while (--yA >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xC >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorC >> 7);
                            return;
                        }
						// gouraudRaster(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, data, yB, 0);
						xA += xStepAB;
						xC += xStepAC;
						colorA += colorStepAB;
						colorC += colorStepAC;
						// yB += width2d;
                        currentScanline++;
					}
				} else {
					yA -= yC;
					yC -= yB;
					// yB = lineOffset[yB];

					while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xB >> 16;
                            int scanlineXB = xA >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorA >> 7);
                            return;
                        }
						// gouraudRaster(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, data, yB, 0);
						xA += xStepAB;
						xB += xStepBC;
						colorA += colorStepAB;
						colorB += colorStepBC;
						// yB += width2d;
                        currentScanline++;
					}
					while (--yA >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xC >> 16;
                            int scanlineXB = xA >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorA >> 7);
                            return;
                        }
						// gouraudRaster(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, data, yB, 0);
						xA += xStepAB;
						xC += xStepAC;
						colorA += colorStepAB;
						colorC += colorStepAC;
						// yB += width2d;
                        currentScanline++;
					}
				}
			} else {
				xC = xB <<= 16;
				colorC = colorB <<= 15;
				if (yB < 0) {
					xC -= xStepAB * yB;
					xB -= xStepBC * yB;
					colorC -= colorStepAB * yB;
					colorB -= colorStepBC * yB;
					yB = 0;
				}

				xA <<= 16;
				colorA <<= 15;
				if (yA < 0) {
					xA -= xStepAC * yA;
					colorA -= colorStepAC * yA;
					yA = 0;
				}

				if (xStepAB < xStepBC) {
					yC -= yA;
					yA -= yB;
					// yB = lineOffset[yB];

					while (--yA >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xC >> 16;
                            int scanlineXB = xB >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorB >> 7);
                            return;
                        }
						// gouraudRaster(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, data, yB, 0);
						xC += xStepAB;
						xB += xStepBC;
						colorC += colorStepAB;
						colorB += colorStepBC;
						// yB += width2d;
                        currentScanline++;
					}
					while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xA >> 16;
                            int scanlineXB = xB >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorB >> 7);
                            return;
                        }
						// gouraudRaster(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, data, yB, 0);
						xA += xStepAC;
						xB += xStepBC;
						colorA += colorStepAC;
						colorB += colorStepBC;
						// yB += width2d;
                        currentScanline++;
					}
				} else {
					yC -= yA;
					yA -= yB;
					// yB = lineOffset[yB];

					while (--yA >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xB >> 16;
                            int scanlineXB = xC >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorC >> 7);
                            return;
                        }
						// gouraudRaster(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, data, yB, 0);
						xC += xStepAB;
						xB += xStepBC;
						colorC += colorStepAB;
						colorB += colorStepBC;
						// yB += width2d;
                        currentScanline++;
					}
					while (--yC >= 0) {
                        if (currentScanline == scanlineY) {
                            int scanlineXA = xB >> 16;
                            int scanlineXB = xA >> 16;
                            if (isOutsideScanline(scanlineXA, scanlineXB)) {
                                discard;
                            }
                            fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorA >> 7);
                            return;
                        }
						// gouraudRaster(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, data, yB, 0);
						xA += xStepAC;
						xB += xStepBC;
						colorA += colorStepAC;
						colorB += colorStepBC;
						// yB += width2d;
                        currentScanline++;
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
			xB = xC <<= 16;
			colorB = colorC <<= 15;
			if (yC < 0) {
				xB -= xStepBC * yC;
				xC -= xStepAC * yC;
				colorB -= colorStepBC * yC;
				colorC -= colorStepAC * yC;
				yC = 0;
			}

			xA <<= 16;
			colorA <<= 15;
			if (yA < 0) {
				xA -= xStepAB * yA;
				colorA -= colorStepAB * yA;
				yA = 0;
			}

            if (xStepBC < xStepAC) {
				yB -= yA;
				yA -= yC;
				// yC = lineOffset[yC];

				while (--yA >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xB >> 16;
                        int scanlineXB = xC >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorC >> 7);
                        return;
                    }
					// gouraudRaster(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, data, yC, 0);
					xB += xStepBC;
					xC += xStepAC;
					colorB += colorStepBC;
					colorC += colorStepAC;
					// yC += width2d;
                    currentScanline++;
				}
				while (--yB >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xB >> 16;
                        int scanlineXB = xA >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorA >> 7);
                        return;
                    }
					// gouraudRaster(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, data, yC, 0);
					xB += xStepBC;
					xA += xStepAB;
					colorB += colorStepBC;
					colorA += colorStepAB;
					// yC += width2d;
                    currentScanline++;
				}
			} else {
				yB -= yA;
				yA -= yC;
				// yC = lineOffset[yC];

				while (--yA >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xC >> 16;
                        int scanlineXB = xB >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorB >> 7);
                        return;
                    }
					// gouraudRaster(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, data, yC, 0);
					xB += xStepBC;
					xC += xStepAC;
					colorB += colorStepBC;
					colorC += colorStepAC;
					// yC += width2d;
                    currentScanline++;
				}
				while (--yB >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xA >> 16;
                        int scanlineXB = xB >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorB >> 7);
                        return;
                    }
					// gouraudRaster(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, data, yC, 0);
					xB += xStepBC;
					xA += xStepAB;
					colorB += colorStepBC;
					colorA += colorStepAB;
					// yC += width2d;
                    currentScanline++;
				}
			}
        } else {
			xA = xC <<= 16;
			colorA = colorC <<= 15;
			if (yC < 0) {
				xA -= xStepBC * yC;
				xC -= xStepAC * yC;
				colorA -= colorStepBC * yC;
				colorC -= colorStepAC * yC;
				yC = 0;
			}

			xB <<= 16;
			colorB <<= 15;
			if (yB < 0) {
				xB -= xStepAB * yB;
				colorB -= colorStepAB * yB;
				yB = 0;
			}

			if (xStepBC < xStepAC) {
                yA -= yB;
                yB -= yC;

                while (--yB >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xA >> 16;
                        int scanlineXB = xC >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorA >> 7, colorC >> 7);
                        return;
                    }
                    // gouraudRaster(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, data, yC, 0);
                    xA += xStepBC;
                    xC += xStepAC;
                    colorA += colorStepBC;
                    colorC += colorStepAC;
                    // yC += width2d;
                    currentScanline++;
                }
                while (--yA >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xB >> 16;
                        int scanlineXB = xC >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorB >> 7, colorC >> 7);
                        return;
                    }
                    // gouraudRaster(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, data, yC, 0);
                    xB += xStepAB;
                    xC += xStepAC;
                    colorB += colorStepAB;
                    colorC += colorStepAC;
                    // yC += width2d;
                    currentScanline++;
                }
            } else {
				yA -= yB;
				yB -= yC;
					
                while (--yB >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xC >> 16;
                        int scanlineXB = xA >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorA >> 7);
                        return;
                    }
					// gouraudRaster(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, data, yC, 0);
					xA += xStepBC;
					xC += xStepAC;
					colorA += colorStepBC;
					colorC += colorStepAC;
					// yC += width2d;
                    currentScanline++;
				}
				while (--yA >= 0) {
                    if (currentScanline == scanlineY) {
                        int scanlineXA = xC >> 16;
                        int scanlineXB = xB >> 16;
                        if (isOutsideScanline(scanlineXA, scanlineXB)) {
                            discard;
                        }
                        fragColor.rgb = getScanlineColor(scanlineXA, scanlineXB, colorC >> 7, colorB >> 7);
                        return;
                    }
					// gouraudRaster(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, data, yC, 0);
					xB += xStepAB;
					xC += xStepAC;
					colorB += colorStepAB;
					colorC += colorStepAC;
					// yC += width2d;
                    currentScanline++;
				}
            }
        }
    }
    
    // discard;
    // fragColor = vec4(1.0, 1.0, 1.0, 1.0);
}

`.trim();
