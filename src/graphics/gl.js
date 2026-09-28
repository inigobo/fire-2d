export function createContext(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL 2 is unavailable');
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('Floating-point render targets are unavailable');
  return gl;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${error}`);
  }
  return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
  let vertex;
  let fragment;
  let program;
  try {
    vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('WebGL program allocation failed');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program linking failed: ${gl.getProgramInfoLog(program)}`);
    }
    return { program, uniforms: new Map() };
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

export function createTarget(gl, width, height) {
  const texture = gl.createTexture();
  let framebuffer;
  try {
    if (!texture) throw new Error('WebGL texture allocation failed');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('WebGL framebuffer allocation failed');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Floating-point framebuffer is incomplete');
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer, width, height };
  } catch (error) {
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    if (texture) gl.deleteTexture(texture);
    throw error;
  }
}

export function createPair(gl, width, height) {
  const read = createTarget(gl, width, height);
  try {
    return { read, write: createTarget(gl, width, height), swap() { [this.read, this.write] = [this.write, this.read]; } };
  } catch (error) {
    destroyTarget(gl, read);
    throw error;
  }
}

export function destroyTarget(gl, target) {
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}

export function destroyPair(gl, pair) {
  destroyTarget(gl, pair.read);
  destroyTarget(gl, pair.write);
}

export class Passes {
  constructor(gl, sources) {
    this.gl = gl;
    this.vao = gl.createVertexArray();
    this.programs = {};
    try {
      if (!this.vao) throw new Error('WebGL vertex array allocation failed');
      gl.bindVertexArray(this.vao);
      for (const [name, fragment] of Object.entries(sources)) {
        this.programs[name] = createProgram(gl, VERTEX, fragment);
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  draw(name, target, values = {}, textures = {}) {
    const gl = this.gl;
    const entry = this.programs[name];
    gl.useProgram(entry.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.viewport(0, 0, target?.width ?? gl.drawingBufferWidth, target?.height ?? gl.drawingBufferHeight);
    let unit = 0;
    const location = key => {
      if (!entry.uniforms.has(key)) entry.uniforms.set(key, gl.getUniformLocation(entry.program, key));
      return entry.uniforms.get(key);
    };
    for (const [key, texture] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(location(key), unit++);
    }
    for (const [key, value] of Object.entries(values)) {
      const loc = location(key);
      if (Array.isArray(value)) gl[`uniform${value.length}f`](loc, ...value);
      else gl.uniform1f(loc, value);
    }
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy() {
    for (const entry of Object.values(this.programs)) this.gl.deleteProgram(entry.program);
    this.programs = {};
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    this.vao = null;
  }
}

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
