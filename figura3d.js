/* Treina Ela · personagem 3D dos exercícios · © 2026 WR Lui. Todos os direitos reservados.
   Feito com three.js (licença MIT). Um único renderizador desenha todos os cartões visíveis.
   O corpo (campo de distância, malha e pesos da pele) é código próprio, sem bibliotecas de terceiros. */
(function () {
  "use strict";
  if (!window.THREE) return;
  const T = THREE, D = Math.PI / 180;

  /* ---------- materiais ---------- */
  const M = {
    pele: new T.MeshStandardMaterial({ color: "#e2a583", roughness: .58 }),
    top: new T.MeshStandardMaterial({ color: "#d6336c", roughness: .5 }),
    legging: new T.MeshStandardMaterial({ color: "#2c3040", roughness: .72 }),
    tenis: new T.MeshStandardMaterial({ color: "#f3f4f8", roughness: .55 }),
    sola: new T.MeshStandardMaterial({ color: "#b9bdca", roughness: .8 }),
    cabelo: new T.MeshStandardMaterial({ color: "#3a241b", roughness: .5 }),
    boca: new T.MeshStandardMaterial({ color: "#b4605a", roughness: .6 }),
    olho: new T.MeshStandardMaterial({ color: "#1d1412", roughness: .3 }),
    metal: new T.MeshStandardMaterial({ color: "#b4bccb", roughness: .28, metalness: .85 }),
    ferro: new T.MeshStandardMaterial({ color: "#2a2e39", roughness: .45, metalness: .5 }),
    pad: new T.MeshStandardMaterial({ color: "#3d4357", roughness: .62 }),
    estrutura: new T.MeshStandardMaterial({ color: "#8b93a6", roughness: .35, metalness: .7 }),
    tapete: new T.MeshStandardMaterial({ color: "#c9b8c3", roughness: .9 }),
    elastico: new T.MeshStandardMaterial({ color: "#3fb27f", roughness: .5 }),
    sombra: new T.ShadowMaterial({ opacity: .2 })
  };

  // a pele e as roupas são uma superfície só; a cor de cada região é escolhida no sombreador
  M.pele.onBeforeCompile = sh => {
    sh.uniforms.uTop = { value: M.top.color }; sh.uniforms.uLeg = { value: M.legging.color }; sh.uniforms.uTen = { value: M.tenis.color }; sh.uniforms.uSol = { value: M.sola.color };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 aReg;\nvarying vec4 vReg;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvReg = aReg;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec4 vReg;\nuniform vec3 uTop, uLeg, uTen, uSol;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nvec4 rg = smoothstep(-.0012, .0012, vReg);\ndiffuseColor.rgb = mix(mix(mix(mix(diffuseColor.rgb, uTop, rg.x), uLeg, rg.y), uTen, rg.z), uSol, rg.w);")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, .8, max(rg.x, rg.y)), .5, rg.z);");
  };

  /* ---------- pele contínua ----------
     O corpo é modelado uma única vez como um campo de distância (elipsoides e cápsulas
     fundidos com união suave), transformado em malha por "surface nets" e preso aos ossos
     (as mesmas juntas que animam os exercícios) com pesos suaves. Código próprio. */
  const ss = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const mA = new T.Matrix4(), mB = new T.Matrix4(), vA = new T.Vector3(), vB = new T.Vector3(), vC = new T.Vector3(), qA = new T.Quaternion(), eA = new T.Euler();
  const UM = new T.Vector3(1, 1, 1);
  // elipsoide: centro, raios e rotação no espaço da junta
  function elip(n, x, y, z, rx, ry, rz, k = .03, ex = 0, ey = 0, ez = 0) {
    mA.compose(vA.set(x, y, z), qA.setFromEuler(eA.set(ex, ey, ez)), UM).premultiply(n.matrixWorld);
    const m = mA.elements, bx = Math.hypot(m[0] * rx, m[4] * ry, m[8] * rz), by = Math.hypot(m[1] * rx, m[5] * ry, m[9] * rz), bz = Math.hypot(m[2] * rx, m[6] * ry, m[10] * rz);
    return { t: 0, n, k, e: mA.clone().invert().elements, rx, ry, rz, m: Math.min(rx, ry, rz), bb: [m[12] - bx, m[13] - by, m[14] - bz, m[12] + bx, m[13] + by, m[14] + bz] };
  }
  // cápsula com um raio em cada ponta; ach achata a seção (no eixo Z da junta), achX no outro
  function cone(n, ax, ay, az, bx, by, bz, ra, rb, k = .03, ach = 1, achX = 1) {
    const dir = vA.set(bx - ax, by - ay, bz - az), L = dir.length(); dir.divideScalar(L);
    const ref = Math.abs(dir.z) > .9 ? vB.set(0, 1, 0) : vB.set(0, 0, 1);
    const X = vC.crossVectors(dir, ref).normalize(), Z = ref.crossVectors(X, dir).normalize();
    mA.set(X.x * achX, dir.x, Z.x * ach, ax, X.y * achX, dir.y, Z.y * ach, ay, X.z * achX, dir.z, Z.z * ach, az, 0, 0, 0, 1).premultiply(n.matrixWorld);
    const pa = new T.Vector3(ax, ay, az).applyMatrix4(n.matrixWorld), pb = new T.Vector3(bx, by, bz).applyMatrix4(n.matrixWorld), r = Math.max(ra, rb);
    const b = (ra - rb) / L;
    return { t: 1, n, k, e: mA.clone().invert().elements, ra, rb, L, b, a: Math.sqrt(1 - b * b), m: Math.min(ach, achX, 1),
      bb: [Math.min(pa.x, pb.x) - r, Math.min(pa.y, pb.y) - r, Math.min(pa.z, pb.z) - r, Math.max(pa.x, pb.x) + r, Math.max(pa.y, pb.y) + r, Math.max(pa.z, pb.z) + r] };
  }
  // corte por um plano (fica o lado para onde a normal aponta), só dentro da caixa dada
  function corte(n, ox, oy, oz, nx, ny, nz, k, cx0, cy0, cz0, cx1, cy1, cz1) {
    qA.setFromUnitVectors(vA.set(0, 1, 0), vB.set(nx, ny, nz).normalize());
    mA.compose(vA.set(ox, oy, oz), qA, UM).premultiply(n.matrixWorld);
    const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let i = 0; i < 8; i++) { vA.set(i & 1 ? cx1 : cx0, i & 2 ? cy1 : cy0, i & 4 ? cz1 : cz0).applyMatrix4(n.matrixWorld);
      bb[0] = Math.min(bb[0], vA.x); bb[1] = Math.min(bb[1], vA.y); bb[2] = Math.min(bb[2], vA.z); bb[3] = Math.max(bb[3], vA.x); bb[4] = Math.max(bb[4], vA.y); bb[5] = Math.max(bb[5], vA.z); }
    return { t: 2, n, k, e: mA.clone().invert().elements, bb, m: 1 };
  }
  function distP(p, x, y, z) {
    const e = p.e, qx = e[0] * x + e[4] * y + e[8] * z + e[12], qy = e[1] * x + e[5] * y + e[9] * z + e[13], qz = e[2] * x + e[6] * y + e[10] * z + e[14];
    if (p.t === 0) {
      const ax = qx / p.rx, ay = qy / p.ry, az = qz / p.rz, k0 = Math.sqrt(ax * ax + ay * ay + az * az);
      if (k0 < 1e-5) return -p.m;
      const bx = ax / p.rx, by = ay / p.ry, bz = az / p.rz;
      return k0 * (k0 - 1) / Math.sqrt(bx * bx + by * by + bz * bz);
    }
    if (p.t === 1) {
      const r = Math.sqrt(qx * qx + qz * qz), kk = qy * p.a - r * p.b;
      let d;
      if (kk < 0) d = Math.sqrt(r * r + qy * qy) - p.ra;
      else if (kk > p.a * p.L) d = Math.sqrt(r * r + (qy - p.L) * (qy - p.L)) - p.rb;
      else d = r * p.a + qy * p.b - p.ra;
      return d * p.m;
    }
    return -qy;
  }
  // campo → malha suave. sim = espelha no plano x=0 (só calcula metade)
  function construir(prims, h, sim) {
    let bx0 = 1e9, by0 = 1e9, bz0 = 1e9, bx1 = -1e9, by1 = -1e9, bz1 = -1e9;
    for (const p of prims) if (p.t !== 2) { bx0 = Math.min(bx0, p.bb[0]); by0 = Math.min(by0, p.bb[1]); bz0 = Math.min(bz0, p.bb[2]); bx1 = Math.max(bx1, p.bb[3]); by1 = Math.max(by1, p.bb[4]); bz1 = Math.max(bz1, p.bb[5]); }
    const mg = 3 * h, mx = Math.ceil((Math.max(bx1, -bx0) + mg) / h);
    const x0 = -mx * h, y0 = by0 - mg, z0 = bz0 - mg;
    const nx = 2 * mx + 1, ny = Math.ceil((by1 - by0 + 2 * mg) / h) + 1, nz = Math.ceil((bz1 - bz0 + 2 * mg) / h) + 1, sxy = nx * ny;
    const F = new Float32Array(nx * ny * nz).fill(9);
    for (const p of prims) {
      const k = p.k, pad = p.t === 2 ? 0 : k + 2 * h, bb = p.bb;
      const ia = Math.max(sim ? mx : 0, Math.floor((bb[0] - pad - x0) / h)), ib = Math.min(nx - 1, Math.ceil((bb[3] + pad - x0) / h));
      const ja = Math.max(0, Math.floor((bb[1] - pad - y0) / h)), jb = Math.min(ny - 1, Math.ceil((bb[4] + pad - y0) / h));
      const ka = Math.max(0, Math.floor((bb[2] - pad - z0) / h)), kb = Math.min(nz - 1, Math.ceil((bb[5] + pad - z0) / h));
      const corta = p.t === 2;
      for (let kk = ka; kk <= kb; kk++) for (let j = ja; j <= jb; j++) {
        let id = ia + j * nx + kk * sxy; const y = y0 + j * h, z = z0 + kk * h;
        for (let i = ia; i <= ib; i++, id++) {
          const d = distP(p, x0 + i * h, y, z), o = F[id];
          let q = k - Math.abs(o - d); q = q > 0 ? q * q * .25 / k : 0;
          F[id] = corta ? (o > d ? o : d) + q : (o < d ? o : d) - q;
        }
      }
    }
    if (sim) for (let kk = 0; kk < nz; kk++) for (let j = 0; j < ny; j++) { const b = j * nx + kk * sxy; for (let i = 0; i < mx; i++) F[b + i] = F[b + 2 * mx - i]; }
    // amostra trilinear do campo
    const amostra = (x, y, z) => {
      let fx = (x - x0) / h, fy = (y - y0) / h, fz = (z - z0) / h;
      fx = fx < 0 ? 0 : fx > nx - 1.001 ? nx - 1.001 : fx; fy = fy < 0 ? 0 : fy > ny - 1.001 ? ny - 1.001 : fy; fz = fz < 0 ? 0 : fz > nz - 1.001 ? nz - 1.001 : fz;
      const i = fx | 0, j = fy | 0, kk = fz | 0, b = i + j * nx + kk * sxy; fx -= i; fy -= j; fz -= kk;
      const a0 = F[b] + (F[b + 1] - F[b]) * fx, a1 = F[b + nx] + (F[b + nx + 1] - F[b + nx]) * fx, a2 = F[b + sxy] + (F[b + sxy + 1] - F[b + sxy]) * fx, a3 = F[b + sxy + nx] + (F[b + sxy + nx + 1] - F[b + sxy + nx]) * fx;
      const c0 = a0 + (a1 - a0) * fy, c1 = a2 + (a3 - a2) * fy; return c0 + (c1 - c0) * fz;
    };
    // surface nets: um vértice por célula cortada pela superfície
    const cx = nx - 1, cy = ny - 1, cz = nz - 1, cel = new Int32Array(cx * cy * cz).fill(-1), P = [], v = new Float32Array(8);
    const OX = [0, 1, 0, 1, 0, 1, 0, 1], OY = [0, 0, 1, 1, 0, 0, 1, 1], OZ = [0, 0, 0, 0, 1, 1, 1, 1], EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3], EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
    let nv = 0;
    for (let kk = 0; kk < cz; kk++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
      const b = i + j * nx + kk * sxy;
      v[0] = F[b]; v[1] = F[b + 1]; v[2] = F[b + nx]; v[3] = F[b + nx + 1]; v[4] = F[b + sxy]; v[5] = F[b + sxy + 1]; v[6] = F[b + sxy + nx]; v[7] = F[b + sxy + nx + 1];
      let m = 0; for (let c = 0; c < 8; c++) if (v[c] < 0) m |= 1 << c;
      if (m === 0 || m === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (let e = 0; e < 12; e++) { const a = EA[e], c = EB[e], va = v[a], vb = v[c]; if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb); sx += OX[a] + (OX[c] - OX[a]) * t; sy += OY[a] + (OY[c] - OY[a]) * t; sz += OZ[a] + (OZ[c] - OZ[a]) * t; n++; }
      P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (kk + sz / n) * h); cel[i + j * cx + kk * cx * cy] = nv++;
    }
    const pos = new Float32Array(P), I = [], cxy = cx * cy;
    const quad = (a, b, c, d, inv) => { if (inv) { const t = b; b = d; d = t; }
      const d1 = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2, d2 = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
      if (d1 <= d2) I.push(a, b, c, a, c, d); else I.push(a, b, d, b, c, d); };
    for (let kk = 1; kk < cz; kk++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
      const b = i + j * nx + kk * sxy, dentro = F[b] < 0, c = i + j * cx + kk * cxy;
      if ((F[b + 1] < 0) !== dentro) quad(cel[c - cx - cxy], cel[c - cxy], cel[c], cel[c - cx], !dentro);
      if ((F[b + nx] < 0) !== dentro) quad(cel[c - 1 - cxy], cel[c - cxy], cel[c], cel[c - 1], dentro);
      if ((F[b + sxy] < 0) !== dentro) quad(cel[c - 1 - cx], cel[c - cx], cel[c], cel[c - 1], !dentro);
    }
    const idx = nv > 65535 ? new Uint32Array(I) : new Uint16Array(I);
    // alisa a malha e devolve os vértices para a superfície; normais vêm do próprio campo
    const nor = new Float32Array(nv * 3), ac = new Float32Array(nv * 3), ct = new Uint16Array(nv);
    const grad = (x, y, z, o) => { o.set(amostra(x + h, y, z) - amostra(x - h, y, z), amostra(x, y + h, z) - amostra(x, y - h, z), amostra(x, y, z + h) - amostra(x, y, z - h)); return o; };
    for (let it = 0; it < 3; it++) {
      if (it < 2) {
        ac.fill(0); ct.fill(0);
        for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) { const p = idx[t + a], q = idx[t + (a + 1) % 3]; ac[p * 3] += pos[q * 3]; ac[p * 3 + 1] += pos[q * 3 + 1]; ac[p * 3 + 2] += pos[q * 3 + 2]; ct[p]++; }
        for (let p = 0; p < nv; p++) if (ct[p]) for (let a = 0; a < 3; a++) pos[p * 3 + a] += (ac[p * 3 + a] / ct[p] - pos[p * 3 + a]) * .5;
      }
      for (let p = 0; p < nv; p++) {
        const x = pos[p * 3], y = pos[p * 3 + 1], z = pos[p * 3 + 2]; grad(x, y, z, vA);
        const g = vA.length() || 1, f = amostra(x, y, z) * 2 * h / g; vA.divideScalar(g);
        pos[p * 3] = x - vA.x * f; pos[p * 3 + 1] = y - vA.y * f; pos[p * 3 + 2] = z - vA.z * f;
        nor[p * 3] = vA.x; nor[p * 3 + 1] = vA.y; nor[p * 3 + 2] = vA.z;
      }
    }
    return { pos, nor, idx, nv, amostra, grad };
  }
  // espalha os pesos pela vizinhança da malha (transições macias)
  function alisarPesos(W, nb, idx, nv, vezes) {
    const ac = new Float32Array(nv * nb), ct = new Uint16Array(nv);
    for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) ct[idx[t + a]]++;
    for (let it = 0; it < vezes; it++) {
      ac.fill(0);
      for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) { const p = idx[t + a] * nb, q = idx[t + (a + 1) % 3] * nb; for (let b = 0; b < nb; b++) ac[p + b] += W[q + b]; }
      for (let p = 0; p < nv; p++) if (ct[p]) for (let b = 0; b < nb; b++) W[p * nb + b] = W[p * nb + b] * .5 + ac[p * nb + b] / ct[p] * .5;
    }
  }
  // fica com as 4 maiores influências de cada vértice
  function malhaComPele(g, W, nb, ossos, mat, extra) {
    const nv = g.nv, si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
    for (let p = 0; p < nv; p++) {
      let s = 0;
      for (let c = 0; c < 4; c++) { let m = -1, mi = 0; for (let b = 0; b < nb; b++) if (W[p * nb + b] > m) { m = W[p * nb + b]; mi = b; }
        si[p * 4 + c] = mi; sw[p * 4 + c] = m > 0 ? m : 0; s += sw[p * 4 + c]; W[p * nb + mi] = -1; }
      for (let c = 0; c < 4; c++) sw[p * 4 + c] /= s || 1;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(g.pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(g.nor, 3));
    geo.setAttribute("skinIndex", new T.BufferAttribute(si, 4)); geo.setAttribute("skinWeight", new T.BufferAttribute(sw, 4));
    if (extra) geo.setAttribute("aReg", new T.BufferAttribute(extra, 4));
    geo.setIndex(new T.BufferAttribute(g.idx, 1));
    const m = new T.SkinnedMesh(geo, mat); m.frustumCulled = false; m.castShadow = true;
    m.bind(new T.Skeleton(ossos), new T.Matrix4());
    return m;
  }

  /* ---------- a personagem ---------- */
  const esfera = (r, sx = 1, sy = 1, sz = 1) => { const g = new T.SphereGeometry(r, 28, 20); g.scale(sx, sy, sz); return g; };
  function malha(g, m, pai, x = 0, y = 0, z = 0) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; pai.add(o); return o; }
  const no = (pai, x = 0, y = 0, z = 0, ordem = "XYZ") => { const o = new T.Group(); o.position.set(x, y, z); o.rotation.order = ordem; pai.add(o); return o; };
  const LADOS = [["E", 1], ["D", -1]];
  const RABO = [.85, -.42, -.28, -.1]; // curva de descanso do rabo de cavalo
  const POSE_BASE = { oE: [0, 45], oD: [0, 45], qE: [0, 12], qD: [0, 12] }; // pose em que a pele é modelada
  const H_CORPO = .012, H_CABELO = .0085;

  function criarFigura() {
    const t0 = (window.performance || Date).now();
    const f = { raiz: new T.Group(), meios: [] };
    const R = f.raiz; R.rotation.order = "YXZ";
    /* esqueleto: as mesmas juntas de sempre */
    f.coluna = no(R, 0, .11, 0);
    f.peito = no(f.coluna, 0, .17, 0);
    f.pescoco = no(f.peito, 0, .265, -.01);
    f.cabeca = no(f.pescoco, 0, .1, .005);
    f.rabo = [];
    let pai = f.raboBase = no(f.cabeca, 0, .14, -.1);
    for (let i = 0; i < 4; i++) { const s = no(pai, 0, i ? -.062 : 0, 0); s.rotation.x = RABO[i]; f.rabo.push(s); pai = s; }
    // junta auxiliar que gira metade do ângulo: a pele dobra sem "amassar"
    const meio = (nome, junta, ganho) => { const m = no(junta.parent, junta.position.x, junta.position.y, junta.position.z); f[nome] = m; f.meios.push([m, junta, ganho]); };
    for (const [lado, s] of LADOS) {
      const ombro = no(f.peito, s * .165, .215, -.005, "ZYX");
      const cot = no(ombro, 0, -.28, 0, "XYZ");
      const mao = no(cot, 0, -.25, 0, "XYZ");
      f["ombro" + lado] = ombro; f["cotovelo" + lado] = cot; f["mao" + lado] = mao;
      const q = no(R, s * .09, -.045, 0, "ZYX");
      const j = no(q, 0, -.42, 0, "XYZ");
      const t = no(j, 0, -.41, 0, "XYZ");
      f["quadril" + lado] = q; f["joelho" + lado] = j; f["tornozelo" + lado] = t;
      meio("ombroM" + lado, ombro, .0); meio("cotoveloM" + lado, cot, .5); meio("quadrilM" + lado, q, .0); meio("joelhoM" + lado, j, .5);
      // pontos de contato
      f["calc" + lado] = no(t, 0, -.08, -.06); f["ponta" + lado] = no(t, 0, -.08, .15);
      f["palma" + lado] = no(mao, 0, -.06, 0); f["dedos" + lado] = no(mao, 0, -.135, 0);
    }
    f.gluteo = no(R, 0, -.1, -.09); f.nuca = no(f.peito, 0, .2, -.1); f.topo = no(f.cabeca, 0, .19, 0);
    f.costas = no(f.peito, 0, .1, -.1); f.barriga = no(f.coluna, 0, .05, .12);
    // pontos usados para enquadrar a câmera
    f.medida = ["topo", "nuca", "costas", "barriga", "gluteo", "raiz"].concat(...LADOS.map(([L]) => ["ombro", "cotovelo", "mao", "dedos", "joelho", "calc", "ponta"].map(n => n + L))).map(n => f[n]);

    /* pose de modelagem */
    aplicar(f, POSE_BASE); R.position.set(0, 0, 0); R.updateMatrixWorld(true);
    const P = [], E = (...a) => P.push(elip(...a)), C = (...a) => P.push(cone(...a));
    // quadril, cintura, tórax
    E(R, 0, -.012, -.004, .15, .112, .097, .04);
    E(R, 0, .07, .002, .134, .12, .09, .05);
    E(f.coluna, 0, .06, .004, .116, .15, .085, .05);
    E(f.peito, 0, .09, -.006, .134, .16, .094, .05);
    C(f.peito, -.118, .198, -.014, .118, .198, -.014, .047, .047, .04, .9);
    C(f.pescoco, 0, -.05, -.002, 0, .1, .006, .045, .039, .028);
    // cabeça
    const cb = f.cabeca;
    E(cb, 0, .088, -.008, .079, .097, .095, .02);
    E(cb, 0, .042, .02, .066, .072, .07, .03);
    E(cb, 0, -.012, .046, .03, .027, .03, .03);
    E(cb, 0, .046, .09, .0095, .016, .0125, .012, -.3);
    for (const [L, s] of LADOS) {
      E(R, s * .088, -.075, -.004, .082, .12, .092, .05);          // lateral do quadril
      E(R, s * .068, -.088, -.06, .078, .088, .075, .035);           // glúteo
      E(f.peito, s * .066, .104, .068, .059, .055, .05, .025);     // busto
      C(f.peito, 0, .27, -.022, s * .125, .212, -.016, .04, .04, .035); // trapézio
      E(cb, s * .08, .058, -.008, .009, .023, .015, .008, 0, s * -.3, 0); // orelha
      const om = f["ombro" + L], ct = f["cotovelo" + L], ma = f["mao" + L];
      E(om, s * .004, -.03, 0, .049, .075, .051, .035);            // deltoide
      C(om, 0, -.03, 0, 0, -.27, 0, .04, .032, .03);
      E(om, 0, -.13, .01, .036, .085, .036, .03);                  // bíceps
      C(ct, 0, 0, 0, 0, -.235, 0, .032, .0225, .02, .9);
      E(ct, s * .004, -.075, .002, .035, .08, .032, .03);          // antebraço
      C(ma, 0, .01, 0, 0, -.03, 0, .0225, .024, .015, .78);        // punho
      E(ma, 0, -.046, .002, .035, .04, .0155, .015);               // palma
      E(ma, 0, -.093, .007, .031, .044, .0125, .015, .16);         // dedos
      C(ma, s * -.022, -.022, .01, s * -.047, -.07, .022, .0115, .0095, .01); // polegar
      const q = f["quadril" + L], j = f["joelho" + L], t = f["tornozelo" + L];
      C(q, 0, -.02, 0, 0, -.4, 0, .084, .05, .04);
      E(q, 0, -.16, .02, .069, .16, .067, .04);                    // coxa (frente)
      E(q, 0, -.19, -.022, .063, .15, .059, .04);                  // posterior
      E(j, 0, .005, .01, .04, .05, .04, .03);                   // joelho
      C(j, 0, 0, 0, 0, -.38, 0, .045, .0295, .03);
      E(j, 0, -.12, -.022, .044, .105, .045, .03);                 // panturrilha
      C(t, 0, .05, 0, 0, -.02, -.004, .0285, .037, .02);          // tornozelo e tênis
      C(t, 0, -.069, -.022, 0, -.069, .108, .043, .04, .006, .32);
      E(t, 0, -.04, -.012, .04, .042, .052, .02);
      C(t, 0, -.044, 0, 0, -.052, .1, .04, .034, .02, .8);
      E(t, 0, -.05, .1, .042, .031, .056, .02);
      P.push(corte(t, 0, -.08, 0, 0, 1, 0, .006, -.09, -.14, -.11, .09, -.05, .2));
    }
    const g = construir(P, H_CORPO, true), nv = g.nv, pos = g.pos;

    /* pesos: cada vértice segue as juntas vizinhas */
    const NB = 25, W = new Float32Array(nv * NB), reg = new Float32Array(nv * 4);
    const inv = n => f[n].matrixWorld.clone().invert().elements;
    const I = {}; for (const [L] of LADOS) for (const n of ["ombro", "cotovelo", "mao", "quadril", "joelho", "tornozelo"]) I[n + L] = inv(n + L);
    const ly = (e, x, y, z) => e[1] * x + e[5] * y + e[9] * z + e[13];
    const lr = (e, x, y, z) => Math.hypot(e[0] * x + e[4] * y + e[8] * z + e[12], e[2] * x + e[6] * y + e[10] * z + e[14]);
    for (let p = 0; p < nv; p++) {
      const x = pos[p * 3], y = pos[p * 3 + 1], z = pos[p * 3 + 2], o = p * NB;
      let resto = 1, topR = 1e9, braco = 0, legR = Math.min(.165 - y, .3 - Math.abs(x)), tenR = -1, solR = -1;
      LADOS.forEach(([L, s], li) => {
        const b = 5 + li * 10;
        // braço
        let e = I["ombro" + L];
        const sa = -ly(e, x, y, z), a = ss(-.05, .075, sa) * (1 - ss(.064, .098, lr(e, x, y, z)));
        if (a > 0) {
          braco = a;
          const w = Math.max(0, 2 * a - 1), c = ss(-.045, .045, -ly(I["cotovelo" + L], x, y, z)), m = ss(-.025, .02, -ly(I["mao" + L], x, y, z)), w2 = w * Math.max(0, 2 * c - 1);
          resto -= Math.min(1, 2 * a); W[o + b] = 1 - Math.abs(2 * a - 1);
          W[o + b + 1] = w * Math.max(0, 1 - 2 * c); W[o + b + 2] = w * (1 - Math.abs(2 * c - 1)); W[o + b + 3] = w2 * (1 - m); W[o + b + 4] = w2 * m;
        }
        // perna
        e = I["quadril" + L];
        const sl = -ly(e, x, y, z), l = ss(-.055, .115, sl) * ss(-.012, .012, x * s) * (1 - ss(.14, .19, lr(e, x, y, z)) * (1 - ss(.2, .3, sl)));
        if (l > 0) {
          const w = Math.max(0, 2 * l - 1), c = ss(-.065, .065, -ly(I["joelho" + L], x, y, z)), et = I["tornozelo" + L], yt = ly(et, x, y, z), m = ss(-.075, -.015, -yt), w2 = w * Math.max(0, 2 * c - 1);
          resto -= Math.min(1, 2 * l); W[o + b + 5] = 1 - Math.abs(2 * l - 1);
          W[o + b + 6] = w * Math.max(0, 1 - 2 * c); W[o + b + 7] = w * (1 - Math.abs(2 * c - 1)); W[o + b + 8] = w2 * (1 - m); W[o + b + 9] = w2 * m;
          legR = Math.min(legR, yt - .075); tenR = Math.max(tenR, .012 - .12 * (et[2] * x + et[6] * y + et[10] * z + et[14]) - yt); solR = Math.max(solR, -.055 - yt);
        }
      });
      if (resto < 0) resto = 0;
      // tronco, pescoço e cabeça
      const c1 = ss(.04, .18, y), c2 = ss(.21, .35, y), hd = ss(-.02, .02, y - (.612 - .4 * z));
      const nk = ss(.5, .575, y) * Math.max(1 - ss(.055, .095, Math.hypot(x, z + .008)), hd);
      W[o] = resto * (1 - c1); W[o + 1] = resto * c1 * (1 - c2); W[o + 2] = resto * c2 * (1 - nk); W[o + 3] = resto * nk * (1 - hd); W[o + 4] = resto * nk * hd;
      // roupa: top, legging, tênis e sola (valor > 0 = dentro da peça)
      const ax = Math.abs(x), ry = .07 + .06 * ss(-.03, .03, z);
      topR = Math.min((.3 - braco) * .1, y - .318, .54 - y, Math.hypot(ax - .218, y - .462) - (.128 - .024 * ss(-.01, .05, z)), .15 - ax, (Math.hypot(x / .085, (y - .56) / ry) - 1) * .085);
      const lim = v => v < -.05 ? -.05 : v > .05 ? .05 : v;
      reg[p * 4] = lim(topR); reg[p * 4 + 1] = lim(legR); reg[p * 4 + 2] = lim(tenR); reg[p * 4 + 3] = lim(solR);
    }
    alisarPesos(W, NB, g.idx, nv, 3);
    // o tecido tem uma espessura leve sobre a pele
    for (let p = 0; p < nv; p++) { const d = .0032 * ss(-.004, .01, reg[p * 4]) + .0022 * ss(-.004, .01, reg[p * 4 + 1]); for (let a = 0; a < 3; a++) pos[p * 3 + a] += g.nor[p * 3 + a] * d; }
    const ossos = [R, f.coluna, f.peito, f.pescoco, f.cabeca];
    for (const [L] of LADOS) ossos.push(f["ombroM" + L], f["ombro" + L], f["cotoveloM" + L], f["cotovelo" + L], f["mao" + L], f["quadrilM" + L], f["quadril" + L], f["joelhoM" + L], f["joelho" + L], f["tornozelo" + L]);
    f.pele = malhaComPele(g, W, NB, ossos, M.pele, reg); R.add(f.pele);

    /* rosto: olhos, sobrancelhas e boca pousados sobre a pele */
    const cab = f.cabeca.getWorldPosition(new T.Vector3());
    const pousar = (o, x, y, afunda) => { let z = cab.z + .16; while (z > cab.z && g.amostra(x + cab.x, y + cab.y, z) > 0) z -= .001;
      g.grad(x + cab.x, y + cab.y, z, vA).normalize(); o.position.set(x, y, z - cab.z).addScaledVector(vA, -afunda); o.quaternion.setFromUnitVectors(vB.set(0, 0, 1), vA); return o; };
    for (const [, s] of LADOS) {
      pousar(malha(esfera(1, .0098, .013, .0045), M.olho, cb), s * .033, .07, .0012).castShadow = false;
      const sb = pousar(malha(esfera(1, .0135, .0026, .003), M.cabelo, cb), s * .034, .096, .0008); sb.rotateZ(s * -.14); sb.castShadow = false;
    }
    pousar(malha(esfera(1, .015, .0038, .003), M.boca, cb), 0, .011, .0012).castShadow = false;

    /* cabelo: touca + rabo de cavalo, também numa malha só */
    f.rabo.forEach((s, i) => { s.rotation.x = RABO[i]; }); R.updateMatrixWorld(true);
    const Hp = [], rb = f.rabo, raios = [.027, .033, .031, .025, .015];
    Hp.push(elip(cb, 0, .093, -.01, .091, .103, .106, .02), elip(cb, 0, .07, -.04, .08, .08, .08, .03));
    Hp.push(corte(cb, 0, .1, .05, 0, 1, -1.0, .025, -.2, -.1, -.2, .2, .3, .2));
    Hp.push(corte(cb, 0, .02, -.02, 0, 1, .55, .02, -.2, -.1, -.2, .2, .3, .2));
    Hp.push(elip(f.raboBase, 0, 0, .004, .03, .03, .03, .02));
    rb.forEach((s, i) => Hp.push(cone(s, 0, 0, 0, 0, -.062, 0, raios[i], raios[i + 1], .02, .85)));
    const gh = construir(Hp, H_CABELO, true), NH = 5, WH = new Float32Array(gh.nv * NH);
    const prT = Hp.filter(p => p.t === 1), ir = rb.map(s => s.matrixWorld.clone().invert().elements);
    for (let p = 0; p < gh.nv; p++) {
      const x = gh.pos[p * 3], y = gh.pos[p * 3 + 1], z = gh.pos[p * 3 + 2];
      let dm = 1e9; for (const q of prT) dm = Math.min(dm, distP(q, x, y, z));
      let r = (1 - ss(.004, .02, dm)) * ss(0, .05, -ly(ir[0], x, y, z)); WH[p * NH] = 1 - r;
      for (let i = 0; i < 4; i++) { const prox = i < 3 ? r * ss(-.022, .022, -ly(ir[i + 1], x, y, z)) : 0; WH[p * NH + 1 + i] = r - prox; r = prox; }
    }
    alisarPesos(WH, NH, gh.idx, gh.nv, 2);
    f.cabelo = malhaComPele(gh, WH, NH, [cb, ...rb], M.cabelo); R.add(f.cabelo);
    const el = malha(new T.TorusGeometry(.024, .0075, 12, 28), M.top, rb[0], 0, -.012, 0); el.rotation.x = Math.PI / 2;
    f.tris = (g.idx.length + gh.idx.length) / 3; f.tempo = (window.performance || Date).now() - t0;
    return f;
  }
  // juntas auxiliares: metade da rotação da junta (e um leve volume quando dobra muito)
  const QI = new T.Quaternion();
  function meios(f) {
    for (const [m, j, ganho] of f.meios) {
      m.quaternion.copy(QI).slerp(j.quaternion, .5);
      if (ganho) { const c = Math.max(.5, Math.abs(m.quaternion.w)); m.scale.setScalar(1 + ganho * (1 / c - 1)); }
    }
  }

  /* ---------- poses ---------- */
  // pose = { r:{x,y,z, px,py,pz}, c:[flex,lat,giro], p:[flex,lat,giro], n:flex, oE:[levanta,abre,gira], cE:dobra, qE:[levanta,abre,gira], jE:dobra, tE:pé }
  const CHAVES = ["r.x", "r.y", "r.z", "r.px", "r.py", "r.pz", "c.0", "c.1", "c.2", "p.0", "p.1", "p.2", "n", "h",
    "oE.0", "oE.1", "oE.2", "oD.0", "oD.1", "oD.2", "cE", "cD", "mE", "mD", "qE.0", "qE.1", "qE.2", "qD.0", "qD.1", "qD.2", "jE", "jD", "tE", "tD", "salto"];
  function ler(p, k) { const [a, b] = k.split("."); const v = p[a]; if (v === undefined) return 0; return b === undefined ? v : (v[b] || 0); }
  function aplicar(f, p) {
    const g = k => ler(p, k) * D;
    f.raiz.rotation.set(g("r.x"), g("r.y"), g("r.z"));
    f.coluna.rotation.set(g("c.0") * .5, g("c.2") * .5, g("c.1") * .5);
    f.peito.rotation.set(g("c.0") * .5 + g("p.0"), g("c.2") * .5 + g("p.2"), g("c.1") * .5 + g("p.1"));
    f.pescoco.rotation.set(g("n") * .6, g("h") * .5, 0); f.cabeca.rotation.set(g("n") * .4, g("h") * .5, 0);
    for (const [L, s] of [["E", 1], ["D", -1]]) {
      // ombro: Z abre para o lado, Y gira o braço, X leva para frente/cima
      f["ombro" + L].rotation.set(-g("o" + L + ".0"), s * g("o" + L + ".2"), s * g("o" + L + ".1"));
      f["cotovelo" + L].rotation.set(-g("c" + L), 0, 0);
      f["mao" + L].rotation.set(-g("m" + L), 0, 0);
      f["quadril" + L].rotation.set(-g("q" + L + ".0"), s * g("q" + L + ".2"), s * g("q" + L + ".1"));
      f["joelho" + L].rotation.set(g("j" + L), 0, 0);
      f["tornozelo" + L].rotation.set(-g("t" + L), 0, 0);
    }
  }
  function misturar(a, b, t) {
    const o = {};
    for (const k of CHAVES) {
      const v = ler(a, k) + (ler(b, k) - ler(a, k)) * t;
      const [x, y] = k.split(".");
      if (y === undefined) o[x] = v; else { (o[x] = o[x] || [])[+y] = v; }
    }
    o.r = { x: o.r[0], y: o.r[1], z: o.r[2], px: o.r[3], py: o.r[4], pz: o.r[5] };
    return o;
  }
  // os índices de r foram gravados como 0..5 acima; ajusta a leitura
  const RK = ["x", "y", "z", "px", "py", "pz"];
  function ler2(p, k) { const [a, b] = k.split("."); if (a === "r") return p.r ? (p.r[b] || 0) : 0; return ler(p, k); }
  function mix(a, b, t) {
    const o = { r: {} };
    for (const k of CHAVES) {
      const v = ler2(a, k) + (ler2(b, k) - ler2(a, k)) * t, [x, y] = k.split(".");
      if (x === "r") o.r[y] = v; else if (y === undefined) o[x] = v; else (o[x] = o[x] || [])[+y] = v;
    }
    return o;
  }
  const W = new T.Vector3(), W2 = new T.Vector3();
  const mundo = o => o.getWorldPosition(new T.Vector3());
  // apoia no chão e mantém fixo o ponto escolhido (pés no chão não escorregam)
  function assentar(f, ex, pose, alvo) {
    const pr = pose.r || {};
    f.raiz.position.set(pr.px || 0, (pr.py ?? .95), pr.pz || 0);
    f.raiz.updateMatrixWorld(true);
    // pés retos no chão
    if (ex.peReto) for (const L of ["E", "D"]) {
      const t = f["tornozelo" + L]; const c = mundo(f["calc" + L]), p = mundo(f["ponta" + L]);
      const ang = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z));
      if (ex.peReto === true || ex.peReto.includes(L)) { t.rotation.x += ang; }
    }
    f.raiz.updateMatrixWorld(true);
    if (ex.chao && ex.chao.length) {
      let min = Infinity; for (const n of ex.chao) min = Math.min(min, mundo(f[n]).y);
      f.raiz.position.y -= min - (ex.alturaChao || 0) - (pose.salto || 0);
    }
    if (ex.fixo) {
      f.raiz.updateMatrixWorld(true);
      const m = new T.Vector3(); ex.fixo.forEach(n => m.add(mundo(f[n]))); m.divideScalar(ex.fixo.length);
      if (!alvo.fixo) alvo.fixo = m.clone();
      f.raiz.position.x += alvo.fixo.x - m.x; f.raiz.position.z += alvo.fixo.z - m.z;
    }
    f.raiz.updateMatrixWorld(true);
  }

  /* ---------- aparelhos ---------- */
  const caixa = (w, h, d, m, pai, x, y, z) => { const g = new T.BoxGeometry(w, h, d, 2, 2, 2); return malha(g, m, pai, x, y, z); };
  const cil = (r, h, m, pai, x, y, z, seg = 18) => malha(new T.CylinderGeometry(r, r, h, seg), m, pai, x, y, z);
  function bancoAlmofada(w, d, h, pai, x = 0, z = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); pai.add(g);
    caixa(w, .07, d, M.pad, g, 0, h - .035, 0);
    for (const sz of [-1, 1]) { cil(.022, h - .07, M.estrutura, g, 0, (h - .07) / 2, sz * (d / 2 - .08)); caixa(w * .9, .03, .05, M.estrutura, g, 0, .015, sz * (d / 2 - .08)); }
    return g;
  }
  function halter(pai) {
    const g = new T.Group(); pai.add(g); g.position.set(0, -.045, .005); g.rotation.z = Math.PI / 2;
    cil(.012, .2, M.metal, g, 0, 0, 0);
    for (const s of [1, -1]) { cil(.045, .035, M.ferro, g, 0, s * .07, 0, 6); cil(.04, .02, M.ferro, g, 0, s * .095, 0, 6); }
    return g;
  }
  function anilha(pai, x, r = .16) { const g = cil(r, .04, M.ferro, pai, x, 0, 0, 28); g.rotation.z = Math.PI / 2; return g; }

  /* ---------- exercícios ---------- */
  // ajudas para aparelhos que acompanham o corpo
  const tmp1 = new T.Vector3(), tmp2 = new T.Vector3(), CIMA = new T.Vector3(0, 1, 0);
  function cabo(grupo, r = .006, m = M.metal) { const c = new T.Mesh(new T.CylinderGeometry(r, r, 1, 8), m); grupo.add(c); return c; }
  function ligar(c, a, b) { tmp1.copy(b).sub(a); const l = tmp1.length(); c.position.copy(a).addScaledVector(tmp1, .5); c.scale.set(1, Math.max(l, .001), 1); c.quaternion.setFromUnitVectors(CIMA, tmp1.normalize()); }
  const maos = f => mundo(f.palmaE).add(mundo(f.palmaD)).multiplyScalar(.5);
  function coluna(grupo, x, z, h = 2.05) { caixa(.12, h, .12, M.estrutura, grupo, x, h / 2, z); caixa(.5, .04, .4, M.ferro, grupo, x, .02, z); }
  function polia(grupo, x, y, z) { const p = cil(.045, .03, M.ferro, grupo, x, y, z, 20); p.rotation.x = Math.PI / 2; return new T.Vector3(x, y, z); }
  function barraNasMaos(grupo, larg = .9, peso = false) {
    const b = new T.Group(); grupo.add(b); const bar = cil(.014, larg, M.metal, b, 0, 0, 0); bar.rotation.z = Math.PI / 2;
    if (peso) for (const s of [1, -1]) anilha(b, s * (larg / 2 - .07), .17);
    return b;
  }
  function seguirMaos(b, f) { const e = mundo(f.palmaE), d = mundo(f.palmaD); b.position.copy(e).add(d).multiplyScalar(.5); tmp1.copy(e).sub(d).normalize(); b.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), tmp1); }
  function tapete(grupo, l = 1.9, x = 0, z = 0, rot = 0) { const t = caixa(.62, .012, l, M.tapete, grupo, x, .006, z); t.rotation.y = rot; t.receiveShadow = true; return t; }
  const PES = ["calcE", "calcD", "pontaE", "pontaD"];
  const EX = {};

  EX.squat = { cam: { az: 72, el: 10 }, chao: PES, fixo: ["calcE", "calcD"], peReto: true,
    k: [{ qE: [0, 9], qD: [0, 9], oE: [80, 8], oD: [80, 8], cE: 8, cD: 8 },
        { r: { x: 38 }, c: [8], n: -40, qE: [128, 15, 10], qD: [128, 15, 10], jE: 120, jD: 120, oE: [96, 10], oD: [96, 10], cE: 8, cD: 8 }] };

  EX.thrust = { cam: { az: 70, el: 14 }, chao: ["calcE", "calcD"], fixo: ["calcE", "calcD"], peReto: true,
    k: [{ r: { x: -62, py: .45 }, c: [22], n: 25, qE: [80, 10], qD: [80, 10], jE: 105, jD: 105, oE: [-10, 38, 20], oD: [-10, 38, 20], cE: 75, cD: 75 },
        { r: { x: -95, py: .62 }, c: [8], n: 52, qE: [4, 10], qD: [4, 10], jE: 86, jD: 86, oE: [-30, 32, 20], oD: [-30, 32, 20], cE: 80, cD: 80 }],
    props(g) { bancoAlmofada(.42, .55, .42, g, 0, -.52).rotation.y = Math.PI / 2;
      const b = barraNasMaos(g, 1.3, true); b.name = "barra"; },
    atualizar(f, t, c) { const b = c.grupo.getObjectByName("barra"); b.position.copy(mundo(f.raiz)).add(new T.Vector3(0, .1, .06)); b.rotation.set(0, 0, 0); } };

  EX.abd = { cam: { az: 32, el: 24 }, chao: [],
    k: [{ r: { py: .52, x: 6 }, c: [6], qE: [90, 6], qD: [90, 6], jE: 90, jD: 90, oE: [12, 24], oD: [12, 24], cE: 25, cD: 25 },
        { r: { py: .52, x: 6 }, c: [6], qE: [88, 38, -8], qD: [88, 38, -8], jE: 90, jD: 90, oE: [12, 24], oD: [12, 24], cE: 25, cD: 25 }],
    props(g, f) { bancoAlmofada(.46, .44, .44, g, 0, -.08);
      caixa(.44, .5, .07, M.pad, g, 0, .74, -.31).rotation.x = -.12; cil(.03, .62, M.estrutura, g, 0, .31, -.38);
      for (const [L, s] of [["E", 1], ["D", -1]]) { caixa(.05, .18, .17, M.pad, f["joelho" + L], s * .075, .03, 0); cil(.04, .12, M.pad, f["mao" + L], 0, -.05, 0).rotation.z = Math.PI / 2; } } };

  EX.kick = { cam: { az: 95, el: 10 }, chao: ["calcE", "pontaE"], fixo: ["calcE"], peReto: ["E"],
    k: [{ r: { x: 18 }, n: -12, qE: [18], jE: 10, qD: [14, 3], jD: 22, oE: [75, 6], oD: [75, 6], cE: 22, cD: 22 },
        { r: { x: 22 }, n: -14, qE: [22], jE: 12, qD: [-38, 4], jD: 6, oE: [75, 6], oD: [75, 6], cE: 22, cD: 22 }],
    props(g) { coluna(g, 0, .62); this._p = polia(g, 0, .12, .55); this._c = cabo(g); caixa(.6, .04, .04, M.metal, g, 0, 1.12, .56); },
    atualizar(f) { ligar(this._c, this._p, mundo(f.tornozeloD)); } };

  EX.pull = { cam: { az: 28, el: 14 },
    k: [{ r: { py: .56 }, qE: [90, 6], qD: [90, 6], jE: 92, jD: 92, oE: [8, 158, 0], oD: [8, 158, 0], cE: 8, cD: 8, n: -10 },
        { r: { py: .56, x: -12 }, c: [-6], qE: [90, 6], qD: [90, 6], jE: 92, jD: 92, oE: [14, 52, 90], oD: [14, 52, 90], cE: 128, cD: 128, n: -6 }],
    props(g) { bancoAlmofada(.4, .4, .46, g, 0, -.02); caixa(.36, .08, .12, M.pad, g, 0, .77, .14); coluna(g, 0, -.32, 2.3);
      this._p = polia(g, 0, 2.2, -.05); this._c = cabo(g); this._b = barraNasMaos(g, 1.2); },
    atualizar(f) { seguirMaos(this._b, f); ligar(this._c, this._p, this._b.position); } };

  EX.row = { cam: { az: 92, el: 12 },
    k: [{ r: { py: .48, x: 18 }, c: [10], qE: [80, 8], qD: [80, 8], jE: 30, jD: 30, oE: [72, 10], oD: [72, 10], cE: 5, cD: 5, n: -10 },
        { r: { py: .48, x: -4 }, c: [-4], qE: [80, 8], qD: [80, 8], jE: 30, jD: 30, oE: [-18, 14], oD: [-18, 14], cE: 100, cD: 100, n: 0 }],
    peReto: true,
    props(g) { bancoAlmofada(.36, .55, .4, g, 0, -.08); caixa(.4, .34, .05, M.ferro, g, 0, .17, .78).rotation.x = -.35; coluna(g, 0, 1.15, 1.1);
      this._p = polia(g, 0, .42, 1.1); this._c = cabo(g); this._b = barraNasMaos(g, .32); },
    atualizar(f) { seguirMaos(this._b, f); ligar(this._c, this._p, this._b.position); } };

  EX.press = { cam: { az: 24, el: 12 },
    k: [{ r: { py: .54 }, qE: [90, 10], qD: [90, 10], jE: 90, jD: 90, oE: [0, 88, 88], oD: [0, 88, 88], cE: 98, cD: 98 },
        { r: { py: .54 }, qE: [90, 10], qD: [90, 10], jE: 90, jD: 90, oE: [0, 168, 88], oD: [0, 168, 88], cE: 12, cD: 12 }],
    peReto: true,
    props(g, f) { bancoAlmofada(.4, .4, .46, g, 0, -.04); caixa(.36, .62, .07, M.pad, g, 0, .82, -.22); cil(.03, .5, M.estrutura, g, 0, .25, -.26);
      halter(f.maoE); halter(f.maoD); } };

  EX.tri = { cam: { az: 82, el: 10 }, chao: PES, fixo: ["calcE", "calcD"], peReto: true,
    k: [{ r: { x: 10 }, qE: [6, 6], qD: [-4, 6], jE: 8, jD: 8, oE: [16, 6], oD: [16, 6], cE: 100, cD: 100, n: -6 },
        { r: { x: 12 }, qE: [6, 6], qD: [-4, 6], jE: 8, jD: 8, oE: [6, 8], oD: [6, 8], cE: 4, cD: 4, n: -6 }],
    props(g) { coluna(g, 0, .55, 2.25); this._p = polia(g, 0, 2.05, .5); this._c = cabo(g); this._b = barraNasMaos(g, .26, false); },
    atualizar(f) { seguirMaos(this._b, f); ligar(this._c, this._p, this._b.position); } };

  EX.walk = { cam: { az: 80, el: 10 }, chao: PES, ciclico: true, periodo: 1300,
    k: [{ qE: [28], jE: 4, qD: [-18], jD: 12, oE: [-22], oD: [24], cE: 30, cD: 40, r: { x: 4 } },
        { qE: [6], jE: 14, qD: [18], jD: 62, oE: [0], oD: [0], cE: 32, cD: 32, r: { x: 4 } },
        { qE: [-18], jE: 12, qD: [28], jD: 4, oE: [24], oD: [-22], cE: 40, cD: 30, r: { x: 4 } },
        { qE: [18], jE: 62, qD: [6], jD: 14, oE: [0], oD: [0], cE: 32, cD: 32, r: { x: 4 } }],
    props(g) { caixa(.7, .12, 1.7, M.ferro, g, 0, .06, 0).receiveShadow = true; caixa(.52, .02, 1.5, M.pad, g, 0, .125, 0).receiveShadow = true;
      for (const s of [1, -1]) { const p = cil(.025, 1.1, M.estrutura, g, s * .33, .62, .8); p.rotation.x = -.18; }
      caixa(.72, .16, .12, M.ferro, g, 0, 1.18, .9).rotation.x = -.5; },
    alturaChao: .135 };

  EX.plank = { cam: { az: 70, el: 16 }, chao: ["palmaE", "palmaD", "pontaE", "pontaD"], fixo: ["pontaE", "pontaD"],
    k: [{ r: { x: 86, py: .3 }, oE: [92, 10], oD: [92, 10], cE: 92, cD: 92, n: -70, tE: 70, tD: 70 },
        { r: { x: 84, py: .3 }, c: [3], oE: [94, 10], oD: [94, 10], cE: 90, cD: 90, n: -66, tE: 70, tD: 70, qE: [6], qD: [6] }],
    alturaChao: .02, props(g) { tapete(g, 2, 0, .1); } };

  EX.legraise = { cam: { az: 70, el: 18 }, chao: ["gluteo", "costas"],
    k: [{ r: { x: -90, py: .3 }, qE: [6], qD: [6], oE: [8, 12], oD: [8, 12], n: 8, tE: -20, tD: -20 },
        { r: { x: -90, py: .3 }, qE: [88], qD: [88], jE: 6, jD: 6, oE: [8, 12], oD: [8, 12], n: 14, tE: -20, tD: -20 }],
    alturaChao: .03, props(g) { tapete(g, 2, 0, -.2); } };

  EX.cablecrunch = { cam: { az: 82, el: 12 }, chao: ["joelhoE", "joelhoD", "pontaE", "pontaD"], alturaChao: .05,
    k: [{ r: { x: 4 }, qE: [0, 8], qD: [0, 8], jE: 92, jD: 92, tE: 60, tD: 60, oE: [158, 22, 20], oD: [158, 22, 20], cE: 140, cD: 140, n: 10 },
        { r: { x: 34 }, c: [64], n: 20, qE: [18, 8], qD: [18, 8], jE: 92, jD: 92, tE: 60, tD: 60, oE: [132, 22, 20], oD: [132, 22, 20], cE: 140, cD: 140 }],
    props(g) { coluna(g, 0, .75, 2.25); this._p = polia(g, 0, 2.05, .7); this._c = cabo(g); tapete(g, .9, 0, -.1); },
    atualizar(f) { ligar(this._c, this._p, maos(f)); } };

  EX.stiff = { cam: { az: 78, el: 10 }, chao: PES, fixo: ["calcE", "calcD"], peReto: true,
    k: [{ qE: [0, 7], qD: [0, 7], oE: [6, 6], oD: [6, 6], jE: 4, jD: 4 },
        { r: { x: 70 }, c: [6], n: -40, qE: [70, 7], qD: [70, 7], jE: 16, jD: 16, oE: [74, 6], oD: [74, 6] }],
    props(g) { this._b = barraNasMaos(g, 1.1, true); this._b.children.slice(1).forEach(a => a.scale.set(.72, 1, .72)); }, atualizar(f) { seguirMaos(this._b, f); } };

  EX.bulg = { cam: { az: 86, el: 10 }, chao: ["calcE", "pontaE"], fixo: ["calcE"], peReto: ["E"],
    k: [{ r: { x: 6 }, qE: [22, 4], jE: 10, qD: [-26, 4], jD: 82, tD: -30, oE: [4, 8], oD: [4, 8] },
        { r: { x: 18 }, qE: [80, 4], jE: 92, qD: [-10, 4], jD: 116, tD: -30, oE: [10, 8], oD: [10, 8], n: -10 }],
    props(g, f) { bancoAlmofada(.4, .4, .45, g, 0, -.7); halter(f.maoE); halter(f.maoD); } };

  EX.legpress = { cam: { az: 84, el: 14 },
    k: [{ r: { x: -48, py: .5 }, c: [6], qE: [128, 10], qD: [128, 10], jE: 110, jD: 110, oE: [20, 20], oD: [20, 20], cE: 20, cD: 20, n: 25 },
        { r: { x: -48, py: .5 }, c: [6], qE: [86, 10], qD: [86, 10], jE: 18, jD: 18, oE: [20, 20], oD: [20, 20], cE: 20, cD: 20, n: 25 }],
    props(g) { const s = caixa(.46, .07, .5, M.pad, g, 0, .4, -.05); s.rotation.x = .2; const e = caixa(.46, .62, .07, M.pad, g, 0, .62, -.4); e.rotation.x = -.85;
      caixa(.5, .05, 1.8, M.estrutura, g, 0, .5, .35).rotation.x = -.75; this._pl = caixa(.62, .55, .05, M.ferro, g, 0, 0, 0); },
    atualizar(f) { const p = mundo(f.tornozeloE).add(mundo(f.tornozeloD)).multiplyScalar(.5); this._pl.position.copy(p).add(new T.Vector3(0, .05, .1)); this._pl.rotation.set(-.75, 0, 0); } };

  EX.ext = { cam: { az: 82, el: 12 },
    k: [{ r: { py: .56, x: -6 }, qE: [92, 6], qD: [92, 6], jE: 90, jD: 90, oE: [14, 22], oD: [14, 22], cE: 30, cD: 30 },
        { r: { py: .56, x: -6 }, qE: [92, 6], qD: [92, 6], jE: 6, jD: 6, oE: [14, 22], oD: [14, 22], cE: 30, cD: 30 }],
    props(g, f) { bancoAlmofada(.46, .48, .48, g, 0, -.02); caixa(.44, .6, .07, M.pad, g, 0, .82, -.3).rotation.x = .12;
      const r = cil(.045, .4, M.pad, f.joelhoE, -.09, -.34, .07); r.rotation.z = Math.PI / 2; } };

  EX.curl = { cam: { az: 80, el: 18 },
    k: [{ r: { x: 90, py: .58 }, oE: [165, 14], oD: [165, 14], cE: 20, cD: 20, n: -30, tE: 30, tD: 30 },
        { r: { x: 90, py: .58 }, oE: [165, 14], oD: [165, 14], cE: 20, cD: 20, n: -30, jE: 112, jD: 112, tE: 30, tD: 30 }],
    props(g, f) { const b = bancoAlmofada(.42, 1.5, .5, g, 0, .1); const r = cil(.045, .38, M.pad, f.joelhoE, -.09, -.36, -.06); r.rotation.z = Math.PI / 2; } };

  EX.afundo = { cam: { az: 84, el: 10 }, chao: PES, fixo: ["calcE"], peReto: ["E"],
    k: [{ qE: [0, 6], qD: [0, 6], oE: [4, 8], oD: [4, 8] },
        { r: { x: 6 }, qE: [84, 6], jE: 92, qD: [-18, 6], jD: 100, tD: -40, oE: [4, 8], oD: [4, 8], n: -4 }],
    props(g, f) { halter(f.maoE); halter(f.maoD); } };

  EX.bike = { cam: { az: 80, el: 12 }, ciclico: true, periodo: 1100,
    k: [{ r: { py: .82, x: 22 }, c: [10], qE: [72], jE: 98, qD: [30], jD: 38, oE: [62, 8], oD: [62, 8], cE: 34, cD: 34, n: -20 },
        { r: { py: .82, x: 22 }, c: [10], qE: [48], jE: 90, qD: [52], jD: 52, oE: [62, 8], oD: [62, 8], cE: 34, cD: 34, n: -20 },
        { r: { py: .82, x: 22 }, c: [10], qE: [30], jE: 38, qD: [72], jD: 98, oE: [62, 8], oD: [62, 8], cE: 34, cD: 34, n: -20 },
        { r: { py: .82, x: 22 }, c: [10], qE: [52], jE: 52, qD: [48], jD: 90, oE: [62, 8], oD: [62, 8], cE: 34, cD: 34, n: -20 }],
    props(g) { caixa(.22, .06, .3, M.pad, g, 0, .74, -.02); const t = cil(.03, .8, M.estrutura, g, 0, .4, .1); t.rotation.x = .5;
      const v = cil(.17, .05, M.metal, g, 0, .26, .5, 32); v.rotation.z = Math.PI / 2; caixa(.5, .04, 1.1, M.estrutura, g, 0, .02, .15);
      const gd = cil(.025, .75, M.estrutura, g, 0, .78, .5); gd.rotation.x = -.3; caixa(.42, .04, .06, M.ferro, g, 0, 1.12, .58); } };

  EX.supino = { cam: { az: 62, el: 26 },
    k: [{ r: { x: -90, py: .56 }, qE: [-14, 20], qD: [-14, 20], jE: 76, jD: 76, oE: [86, 12], oD: [86, 12], cE: 2, cD: 2, n: 8 },
        { r: { x: -90, py: .56 }, qE: [-14, 20], qD: [-14, 20], jE: 76, jD: 76, oE: [10, 74, -78], oD: [10, 74, -78], cE: 92, cD: 92, n: 8 }],
    props(g, f) { bancoAlmofada(.34, 1.2, .44, g, 0, -.18); halter(f.maoE); halter(f.maoD); } };

  EX.lateral = { cam: { az: 22, el: 10 }, chao: PES, peReto: true,
    k: [{ qE: [0, 7], qD: [0, 7], oE: [4, 12], oD: [4, 12], cE: 8, cD: 8 },
        { qE: [0, 7], qD: [0, 7], oE: [8, 86], oD: [8, 86], cE: 12, cD: 12 }],
    props(g, f) { halter(f.maoE); halter(f.maoD); } };

  EX.jack = { cam: { az: 20, el: 10 }, chao: PES, peReto: true, ciclico: true, periodo: 900,
    k: [{ qE: [0, 3], qD: [0, 3], oE: [0, 10], oD: [0, 10], cE: 8, cD: 8, jE: 10, jD: 10 },
        { qE: [0, 14], qD: [0, 14], oE: [0, 90], oD: [0, 90], cE: 8, cD: 8, salto: .08 },
        { qE: [0, 24], qD: [0, 24], oE: [0, 168], oD: [0, 168], cE: 10, cD: 10, jE: 12, jD: 12 },
        { qE: [0, 14], qD: [0, 14], oE: [0, 90], oD: [0, 90], cE: 8, cD: 8, salto: .08 }] };

  EX.crunch = { cam: { az: 72, el: 20 }, chao: ["gluteo", "calcE", "calcD"],
    k: [{ r: { x: -90, py: .3 }, qE: [52, 6], qD: [52, 6], jE: 100, jD: 100, oE: [150, 46, 40], oD: [150, 46, 40], cE: 135, cD: 135, n: 10, tE: 10, tD: 10 },
        { r: { x: -90, py: .3 }, c: [52], n: 22, qE: [52, 6], qD: [52, 6], jE: 100, jD: 100, oE: [150, 46, 40], oD: [150, 46, 40], cE: 135, cD: 135, tE: 10, tD: 10 }],
    alturaChao: .02, props(g) { tapete(g, 2, 0, .1); } };

  EX.flexao = { cam: { az: 70, el: 16 }, chao: ["palmaE", "palmaD", "pontaE", "pontaD"], fixo: ["palmaE", "palmaD"],
    k: [{ r: { x: 74 }, oE: [76, 16], oD: [76, 16], cE: 4, cD: 4, n: -60, tE: 60, tD: 60, mE: -70, mD: -70 },
        { r: { x: 88 }, oE: [30, 40, -30], oD: [30, 40, -30], cE: 96, cD: 96, n: -70, tE: 60, tD: 60, mE: -70, mD: -70 }],
    props(g) { tapete(g, 2, 0, 0); } };

  EX.calf = { cam: { az: 80, el: 10 }, chao: ["pontaE", "pontaD"], alturaChao: .1,
    k: [{ qE: [0, 6], qD: [0, 6], tE: -16, tD: -16, oE: [4, 8], oD: [4, 8] },
        { qE: [0, 6], qD: [0, 6], tE: 34, tD: 34, oE: [4, 8], oD: [4, 8] }],
    props(g, f) { caixa(.6, .1, .3, M.pad, g, 0, .05, .12); halter(f.maoE); halter(f.maoD); } };

  EX.rosca = { cam: { az: 34, el: 10 }, chao: PES, peReto: true,
    k: [{ qE: [0, 7], qD: [0, 7], oE: [4, 8, 0], oD: [4, 8, 0], cE: 6, cD: 6 },
        { qE: [0, 7], qD: [0, 7], oE: [10, 8, 0], oD: [10, 8, 0], cE: 138, cD: 138 }],
    props(g, f) { halter(f.maoE); halter(f.maoD); } };

  EX.sideplank = { cam: { az: 8, el: 16 }, chao: ["cotoveloD", "calcD", "pontaD"], alturaChao: .05,
    k: [{ r: { z: 72 }, oD: [0, 86, 0], cD: 90, oE: [0, 12], cE: 80, qE: [0, 2], tE: 0, n: 0 },
        { r: { z: 76 }, c: [0, -6], oD: [0, 84, 0], cD: 90, oE: [0, 160], cE: 6, qE: [0, 2], n: 0 }],
    props(g) { tapete(g, 2, 0, 0, Math.PI / 2); } };

  EX.superman = { cam: { az: 66, el: 22 }, chao: ["barriga"], alturaChao: .07,
    k: [{ r: { x: 90 }, oE: [168, 14], oD: [168, 14], cE: 4, cD: 4, n: -30, tE: 60, tD: 60 },
        { r: { x: 90 }, c: [-24], n: -40, qE: [-18, 4], qD: [-18, 4], oE: [176, 14], oD: [176, 14], cE: 4, cD: 4, tE: 60, tD: 60 }],
    props(g) { tapete(g, 2, 0, .1); } };

  EX.bandwalk = { cam: { az: 18, el: 10 }, chao: PES, peReto: true, ciclico: true, periodo: 1700,
    k: [{ r: { x: 20 }, c: [4], qE: [44, 10], qD: [44, 10], jE: 52, jD: 52, oE: [30, 10], oD: [30, 10], cE: 70, cD: 70, n: -14 },
        { r: { x: 20 }, c: [4], qE: [44, 10], qD: [52, 28], jE: 52, jD: 58, oE: [30, 10], oD: [30, 10], cE: 70, cD: 70, n: -14, salto: .03 },
        { r: { x: 20, px: -.12 }, c: [4], qE: [44, 22], qD: [44, 22], jE: 52, jD: 52, oE: [30, 10], oD: [30, 10], cE: 70, cD: 70, n: -14 },
        { r: { x: 20, px: -.12 }, c: [4], qE: [52, 6], qD: [44, 18], jE: 58, jD: 52, oE: [30, 10], oD: [30, 10], cE: 70, cD: 70, n: -14, salto: .03 }],
    props(g) { this._c = cabo(g, .012, M.elastico); },
    atualizar(f) { ligar(this._c, mundo(f.joelhoE).add(new T.Vector3(.04, .05, 0)), mundo(f.joelhoD).add(new T.Vector3(-.04, .05, 0))); } };

  /* ---------- palco: um renderizador para todos ---------- */
  let rend = null, cena, cam, fig, luzSol, chaoMalha;
  const cache = {};
  let desligado = false;
  function iniciar() {
    if (rend) return true;
    if (desligado) return false;
    try {
      rend = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    } catch (e) { rend = null; desligado = true; return false; }
    // sem placa de vídeo (desenho por software) o 3D fica lento: o app usa o desenho 2D
    try {
      const gl = rend.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info");
      const nome = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      if (/swiftshader|llvmpipe|software|microsoft basic/i.test(nome) && !window.FORCAR_3D) { rend.dispose(); rend = null; desligado = true; return false; }
    } catch (e) {}
    rend.outputColorSpace = T.SRGBColorSpace; rend.toneMapping = T.ACESFilmicToneMapping; rend.toneMappingExposure = 1.05;
    rend.shadowMap.enabled = true; rend.shadowMap.type = T.PCFSoftShadowMap;
    rend.setClearColor(0, 0);
    cena = new T.Scene();
    cena.add(new T.HemisphereLight("#fff6fa", "#5a4a55", 1.15));
    luzSol = new T.DirectionalLight("#ffffff", 2.1); luzSol.position.set(1.6, 3.2, 2.2); luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(1024, 1024); Object.assign(luzSol.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: .5, far: 8 });
    luzSol.shadow.radius = 5; luzSol.shadow.bias = -.0005; cena.add(luzSol);
    const contra = new T.DirectionalLight("#ffd6e6", .7); contra.position.set(-2, 1.5, -2.5); cena.add(contra);
    chaoMalha = new T.Mesh(new T.CircleGeometry(2.4, 48), M.sombra); chaoMalha.rotation.x = -Math.PI / 2; chaoMalha.receiveShadow = true; cena.add(chaoMalha);
    cam = new T.PerspectiveCamera(28, 10 / 7, .1, 30);
    fig = criarFigura(); cena.add(fig.raiz);
    return true;
  }
  function preparar(nome) {
    if (cache[nome]) return cache[nome];
    const ex = EX[nome]; if (!ex) return null;
    const grupo = new T.Group(); grupo.visible = false; cena.add(grupo);
    const extras = []; // aparelhos presos ao corpo
    if (ex.props) {
      const antes = new Set(); fig.raiz.traverse(o => antes.add(o));
      ex.props(grupo, fig);
      fig.raiz.traverse(o => { if (!antes.has(o) && o.isMesh) extras.push(o); });
    }
    extras.forEach(o => { o.visible = false; });
    // enquadramento: mede a figura no início e no fim do movimento
    const caixaT = new T.Box3(), alvo = {};
    for (const q of ex.k) { aplicar(fig, mix(q, q, 0)); assentar(fig, ex, q, alvo); fig.raiz.updateMatrixWorld(true); for (const n of fig.medida) caixaT.expandByPoint(mundo(n)); extras.forEach(o => caixaT.expandByObject(o)); }
    caixaT.expandByScalar(.075);
    grupo.visible = true; grupo.updateMatrixWorld(true); if (grupo.children.length) caixaT.expandByObject(grupo); grupo.visible = false;
    const c = { ex, grupo, extras, caixa: caixaT, alvo };
    cache[nome] = c; return c;
  }
  function enquadrar(c, aspecto) {
    const b = c.caixa, centro = b.getCenter(new T.Vector3()), tam = b.getSize(new T.Vector3());
    const az = (c.ex.cam?.az ?? 40) * D, el = (c.ex.cam?.el ?? 10) * D;
    const raio = Math.max(b.getBoundingSphere(new T.Sphere()).radius, .55);
    const vfov = cam.fov * D, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspecto);
    const dist = Math.max(raio / Math.sin(Math.min(vfov, hfov) / 2) * (c.ex.zoom || .86), tam.y * .53 / Math.tan(vfov / 2) + .3);
    cam.aspect = aspecto; cam.updateProjectionMatrix();
    cam.position.set(centro.x + Math.sin(az) * Math.cos(el) * dist, centro.y + Math.sin(el) * dist, centro.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(centro.x, centro.y - tam.y * .02, centro.z);
  }
  // rabo de cavalo com mola
  function balancar(d) {
    const v = mundo(fig.cabeca); const ant = d._cab || v; const vel = v.clone().sub(ant); d._cab = v;
    d._bal = d._bal || { x: 0, z: 0 }; const b = d._bal;
    b.x += (-vel.z * 40 - b.x) * .15; b.z += (vel.x * 40 - b.z) * .15;
    fig.rabo.forEach((s, i) => { s.rotation.x = RABO[i] + b.x * (i + 1) * .2; s.rotation.z = b.z * (i + 1) * .2; });
  }
  function desenhar(d, t) {
    if (!iniciar()) return false;
    const c = preparar(d.nome); if (!c) return false;
    const ex = c.ex, k = ex.k;
    // posição no ciclo com vários quadros
    let pose;
    if (k.length === 2) pose = mix(k[0], k[1], t);
    else { const x = t * k.length, i = Math.floor(x) % k.length, fr = x - Math.floor(x), s = fr * fr * (3 - 2 * fr); pose = mix(k[i], k[(i + 1) % k.length], s); }
    aplicar(fig, pose); meios(fig); assentar(fig, ex, pose, c.alvo);
    if (ex.atualizar) ex.atualizar(fig, t, c);
    balancar(d);
    for (const n in cache) { cache[n].grupo.visible = n === d.nome; cache[n].extras.forEach(o => { o.visible = n === d.nome; }); }
    const cv = d.cv, w = cv.width, h = cv.height;
    if (rend.domElement.width !== w || rend.domElement.height !== h) rend.setSize(w, h, false);
    enquadrar(c, w / h);
    rend.render(cena, cam);
    const ctx = d.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); ctx.drawImage(rend.domElement, 0, 0);
    return true;
  }
  function cores(c) {
    const set = (m, v) => { if (v) m.color.set(v); };
    set(M.pele, c.pele); set(M.top, c.top); set(M.legging, c.legging); set(M.cabelo, c.cabelo); set(M.tenis, c.tenis);
  }
  // aquece em segundo plano: monta o corpo e compila os shaders sem travar a tela de treino
  let pronto = false, aquecendo = null;
  function aquecer() {
    if (aquecendo) return aquecendo;
    aquecendo = new Promise(res => setTimeout(res, 0)).then(async () => {
      if (!iniciar()) return false;
      for (const n of Object.keys(EX)) preparar(n);
      for (const n in cache) { cache[n].grupo.visible = true; cache[n].extras.forEach(o => { o.visible = true; }); }
      try { if (rend.compileAsync) await rend.compileAsync(cena, cam); else rend.compile(cena, cam); } catch (e) {}
      for (const n in cache) { cache[n].grupo.visible = false; cache[n].extras.forEach(o => { o.visible = false; }); }
      const cv = document.createElement("canvas"); cv.width = 200; cv.height = 140;
      desenhar({ cv, ctx: cv.getContext("2d"), nome: "squat" }, .5);
      pronto = true; return true;
    }).catch(() => false);
    return aquecendo;
  }
  window.Figura3D = { desenhar, aquecer, pronto: () => pronto && !desligado, tem: n => !desligado && !!EX[n], desligar: () => { desligado = true; }, cores, EX, _int: { aplicar, mix, criarFigura, info: () => fig && { tris: fig.tris, ms: fig.tempo } } };
})();
