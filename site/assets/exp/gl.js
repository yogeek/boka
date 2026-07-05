/* BoKa · L'Expérience — renderer WebGL2 minimal, zéro dépendance.
   Un seul canvas plein écran, un triangle plein écran, un fragment shader
   qui compose les 7 scènes et les fond enchaîne selon la progression du scroll.
   window.BokaGL.init(canvas, urls) -> { render(state), resize() } | null si non supporté. */
(function (global) {
  'use strict';

  var VERT =
    '#version 300 es\n' +
    'out vec2 vUv;\n' +
    'void main(){\n' +
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n' +
    '  vUv = p;\n' +                        // 0..2, y vers le haut
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n' +
    '}\n';

  var FRAG =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'out vec4 O;\n' +
    'in vec2 vUv;\n' +
    'uniform vec2 uRes;\n' +
    'uniform float uTime;\n' +
    'uniform float uT;\n' +          // progression globale 0..1
    'uniform vec2 uPtr;\n' +         // pointeur lissé -1..1
    'uniform sampler2D uSky;\n' +
    'uniform sampler2D uValley;\n' +
    'uniform sampler2D uGer;\n' +
    'uniform sampler2D uHer;\n' +
    'uniform sampler2D uAlam;\n' +
    'uniform sampler2D uDrop;\n' +
    // aspects w/h des textures
    'const float A_SKY=1600.0/679.0;\n' +
    'const float A_VAL=1280.0/959.0;\n' +
    'const float A_GER=1600.0/1073.0;\n' +
    'const float A_HER=1000.0/1478.0;\n' +
    'const float A_ALA=1600.0/1073.0;\n' +
    'const float A_DRP=1600.0/893.0;\n' +
    'float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }\n' +
    'float vnoise(vec2 p){\n' +
    '  vec2 i=floor(p), f=fract(p);\n' +
    '  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));\n' +
    '  vec2 u=f*f*(3.0-2.0*f);\n' +
    '  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);\n' +
    '}\n' +
    'float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }\n' +
    'float lum(vec3 c){ return dot(c,vec3(0.299,0.587,0.114)); }\n' +
    // UV « cover » (remplit l'écran sans déformer) + zoom + offset parallaxe
    'vec2 coverUV(vec2 uv,float imgA,float scrA,vec2 off,float zoom){\n' +
    '  vec2 sc = scrA>imgA ? vec2(1.0, imgA/scrA) : vec2(scrA/imgA, 1.0);\n' +
    '  return (uv-0.5)*sc/zoom + 0.5 + off;\n' +
    '}\n' +
    'float band(float t,float a,float b,float w){ return clamp(smoothstep(a-w,a+w,t)-smoothstep(b-w,b+w,t),0.0,1.0); }\n' +
    // --- Scènes ---
    'vec3 sceneSky(vec2 uv,float scrA,float p){\n' +
    '  vec2 iu=coverUV(uv,A_SKY,scrA, vec2(uPtr.x*0.012, uPtr.y*0.008 + p*0.05), 1.05+p*0.10);\n' +
    '  vec3 c=texture(uSky,iu).rgb;\n' +
    '  float f=fbm(uv*vec2(3.0,2.0)+vec2(uTime*0.015,uTime*0.010));\n' +
    '  f=smoothstep(0.25,0.95,f);\n' +
    '  c=mix(c, vec3(0.88,0.84,0.78), f*(0.42-p*0.30));\n' +
    '  float ray=pow(max(0.0, uv.y-0.35),1.5)*max(0.0,0.6-abs(uv.x-0.68));\n' +
    '  c+=vec3(1.0,0.82,0.55)*ray*0.28;\n' +
    '  return c;\n' +
    '}\n' +
    'vec3 sceneValley(vec2 uv,float scrA,float p){\n' +
    '  vec2 iu=coverUV(uv,A_VAL,scrA, vec2(uPtr.x*0.020, uPtr.y*0.012 - (1.0-p)*0.04), 1.14-p*0.08);\n' +
    '  vec3 c=texture(uValley,iu).rgb;\n' +
    '  float band=fbm(uv*vec2(4.0,3.0)+vec2(-uTime*0.02,uTime*0.008));\n' +
    '  float cover=smoothstep(0.0,0.7,1.0-p);\n' +
    '  float mask=cover*smoothstep(0.25,0.95,band)*smoothstep(0.15,0.95,1.0-uv.y+ (1.0-p)*0.3);\n' +
    '  c=mix(c, vec3(0.90,0.88,0.84), mask*0.82);\n' +
    '  return c;\n' +
    '}\n' +
    'vec3 sceneTerre(vec2 uv,float scrA,float p){\n' +
    '  vec2 iu=coverUV(uv,A_GER,scrA, vec2(uPtr.x*0.018, uPtr.y*0.010), 1.15+p*0.14);\n' +
    '  vec3 c=texture(uGer,iu).rgb;\n' +
    '  c*=mix(1.0,1.05,p);\n' +
    '  c+=vec3(0.05,0.03,0.0)*max(0.0,0.7-length((uv-vec2(0.42,0.5))*vec2(scrA,1.0)));\n' +
    '  float pol=0.0;\n' +
    '  for(int i=0;i<6;i++){ float fi=float(i);\n' +
    '    vec2 pp=vec2(fract(sin(fi*12.9)*43758.5), fract(sin(fi*78.2)*12345.6));\n' +
    '    pp.y=fract(pp.y + uTime*0.02*(0.5+pp.x));\n' +
    '    float d=length((uv-pp)*vec2(scrA,1.0));\n' +
    '    pol+=smoothstep(0.028,0.0,d);\n' +
    '  }\n' +
    '  c+=vec3(1.0,0.9,0.7)*pol*0.22;\n' +
    '  return c;\n' +
    '}\n' +
    'vec3 sceneHeritage(vec2 uv,float scrA,float p){\n' +
    '  vec2 iu=coverUV(uv,A_HER,scrA, vec2(uPtr.x*0.010, uPtr.y*0.008), 1.02);\n' +
    '  vec3 ph=texture(uHer,iu).rgb;\n' +
    '  float g=lum(ph);\n' +
    '  vec3 sep=vec3(g)*vec3(1.14,0.98,0.78);\n' +
    '  ph=mix(sep, ph, smoothstep(0.15,0.9,p));\n' +
    '  float gr=hash(uv*uRes*0.5+uTime)*2.0-1.0;\n' +
    '  ph+=gr*0.05;\n' +
    '  float vig=smoothstep(1.05,0.30,length((uv-0.5)*vec2(scrA*0.9,1.0)));\n' +
    '  return mix(vec3(0.03,0.03,0.04), ph, vig);\n' +
    '}\n' +
    'vec3 sceneAlambic(vec2 uv,float scrA,float p){\n' +
    '  vec2 iu=coverUV(uv,A_ALA,scrA, vec2(uPtr.x*0.014, uPtr.y*0.010), 1.08);\n' +
    '  vec3 c=texture(uAlam,iu).rgb;\n' +
    '  float v=fbm(uv*vec2(5.0,4.0)+vec2(uTime*0.05,uTime*0.30));\n' +
    '  v=smoothstep(0.45,0.98,v);\n' +
    '  float mask=smoothstep(0.0,0.6,uv.y)*smoothstep(0.85,0.30,abs(uv.x-0.55));\n' +
    '  c=mix(c, vec3(0.93,0.91,0.87), v*mask*(0.30+0.40*p));\n' +
    '  return c;\n' +
    '}\n' +
    'vec3 sceneEssence(vec2 uv,float scrA,float p){\n' +
    '  vec3 c=vec3(0.02,0.02,0.03);\n' +
    '  float fall=smoothstep(0.0,0.75,p);\n' +
    '  vec2 dc=vec2(0.5, mix(0.66,0.40,fall));\n' +
    '  vec2 iu=coverUV(uv, A_DRP, scrA, vec2(0.0, 0.30-(dc.y-0.5)), 1.7);\n' +
    '  vec2 d=(uv-dc); d.x*=scrA;\n' +
    '  float r=length(d);\n' +
    '  vec2 dir=normalize(d+1e-4);\n' +
    '  float disp=0.004;\n' +
    '  float rr=texture(uDrop, iu+dir*disp).r;\n' +
    '  float gg=texture(uDrop, iu).g;\n' +
    '  float bb=texture(uDrop, iu-dir*disp).b;\n' +
    '  vec3 drop=vec3(rr,gg,bb);\n' +
    '  c=max(c, drop);\n' +
    '  c+=vec3(0.95,0.65,0.25)*smoothstep(0.17,0.13,r)*0.18;\n' +
    '  c*=(1.0-smoothstep(0.88,1.0,p)*0.9);\n' +
    '  return c;\n' +
    '}\n' +
    'vec3 sceneRencontre(vec2 uv){\n' +
    '  vec3 c=mix(vec3(0.972,0.955,0.925), vec3(0.925,0.890,0.820), 1.0-uv.y);\n' +
    '  c+=vec3(0.02,0.0,0.012)*(1.0-uv.y);\n' +
    '  return c;\n' +
    '}\n' +
    'void main(){\n' +
    '  vec2 uv=vUv;\n' +
    '  float scrA=uRes.x/uRes.y;\n' +
    '  float w=0.045;\n' +
    '  float w0=band(uT,-0.1,0.1428,w);\n' +
    '  float w1=band(uT,0.1428,0.2857,w);\n' +
    '  float w2=band(uT,0.2857,0.4285,w);\n' +
    '  float w3=band(uT,0.4285,0.5714,w);\n' +
    '  float w4=band(uT,0.5714,0.7142,w);\n' +
    '  float w5=band(uT,0.7142,0.8571,w);\n' +
    '  float w6=band(uT,0.8571,1.1,w);\n' +
    '  float sum=w0+w1+w2+w3+w4+w5+w6+1e-4;\n' +
    '  w0/=sum; w1/=sum; w2/=sum; w3/=sum; w4/=sum; w5/=sum; w6/=sum;\n' +
    '  float seg=1.0/7.0;\n' +
    '  vec3 col=vec3(0.0);\n' +
    '  if(w0>0.001) col+=sceneSky(uv,scrA, clamp((uT-0.0*seg)/seg,0.0,1.0))*w0;\n' +
    '  if(w1>0.001) col+=sceneValley(uv,scrA, clamp((uT-1.0*seg)/seg,0.0,1.0))*w1;\n' +
    '  if(w2>0.001) col+=sceneTerre(uv,scrA, clamp((uT-2.0*seg)/seg,0.0,1.0))*w2;\n' +
    '  if(w3>0.001) col+=sceneHeritage(uv,scrA, clamp((uT-3.0*seg)/seg,0.0,1.0))*w3;\n' +
    '  if(w4>0.001) col+=sceneAlambic(uv,scrA, clamp((uT-4.0*seg)/seg,0.0,1.0))*w4;\n' +
    '  if(w5>0.001) col+=sceneEssence(uv,scrA, clamp((uT-5.0*seg)/seg,0.0,1.0))*w5;\n' +
    '  if(w6>0.001) col+=sceneRencontre(uv)*w6;\n' +
    '  float clean=w6;\n' +                 // scène 6 = propre (contenu lisible)
    '  float gr=hash(uv*uRes*0.5+uTime)*2.0-1.0;\n' +
    '  col+=gr*0.028*(1.0-clean*0.85);\n' +
    '  float vig=smoothstep(1.35,0.35,length((uv-0.5)*vec2(scrA,1.0)));\n' +
    '  col*=mix(1.0, 0.80+0.20*vig, 1.0-clean);\n' +
    '  O=vec4(clamp(col,0.0,1.0),1.0);\n' +
    '}\n';

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[BokaGL] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function makeTex(gl) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    // placeholder 1px pour un premier rendu immédiat
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([20, 24, 22, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  function loadInto(gl, tex, url) {
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    };
    img.src = url;
  }

  function init(canvas, urls) {
    var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[BokaGL] link:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    var U = {};
    ['uRes', 'uTime', 'uT', 'uPtr', 'uSky', 'uValley', 'uGer', 'uHer', 'uAlam', 'uDrop'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    var samplers = ['uSky', 'uValley', 'uGer', 'uHer', 'uAlam', 'uDrop'];
    var keys = ['sky', 'valley', 'ger', 'her', 'alam', 'drop'];
    var texes = keys.map(function () { return makeTex(gl); });
    keys.forEach(function (k, i) { if (urls[k]) loadInto(gl, texes[i], urls[k]); });
    for (var i = 0; i < samplers.length; i++) gl.uniform1i(U[samplers[i]], i);

    var dpr = 1;
    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 1.75);
      var w = Math.floor(canvas.clientWidth * dpr);
      var h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();

    function render(state) {
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      for (var i = 0; i < texes.length; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, texes[i]);
      }
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, state.time);
      gl.uniform1f(U.uT, state.t);
      gl.uniform2f(U.uPtr, state.pointer[0], state.pointer[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    return { render: render, resize: resize };
  }

  global.BokaGL = { init: init };
})(window);
