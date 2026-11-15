/* Treina Ela · personagem 3D dos exercícios · © 2026 WR Lui. Todos os direitos reservados.
   Feito com three.js (licença MIT). Um único renderizador desenha todos os cartões visíveis. */
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
    sola: new T.MeshStandardMaterial({ color: "#c9ccd6", roughness: .8 }),
    cabelo: new T.MeshStandardMaterial({ color: "#3a241b", roughness: .5 }),
    olho: new T.MeshStandardMaterial({ color: "#1d1412", roughness: .3 }),
    metal: new T.MeshStandardMaterial({ color: "#b4bccb", roughness: .28, metalness: .85 }),
    ferro: new T.MeshStandardMaterial({ color: "#2a2e39", roughness: .45, metalness: .5 }),
    pad: new T.MeshStandardMaterial({ color: "#3d4357", roughness: .62 }),
    estrutura: new T.MeshStandardMaterial({ color: "#8b93a6", roughness: .35, metalness: .7 }),
    tapete: new T.MeshStandardMaterial({ color: "#c9b8c3", roughness: .9 }),
    elastico: new T.MeshStandardMaterial({ color: "#3fb27f", roughness: .5 }),
    sombra: new T.ShadowMaterial({ opacity: .2 })
  };

  /* ---------- geometrias do corpo ---------- */
  // membro arredondado com perfil de músculo: perfil = [[fração do comprimento, raio], ...]
  function membro(len, perfil, achata = 1, seg = 22) {
    const pts = [new T.Vector2(0, perfil[0][1] * .55)];
    perfil.forEach(([f, r]) => pts.push(new T.Vector2(r, -f * len)));
    const ult = perfil[perfil.length - 1][1];
    pts.push(new T.Vector2(ult * .7, -len - ult * .55), new T.Vector2(0, -len - ult * .8));
    const curva = new T.SplineCurve(pts);
    const g = new T.LatheGeometry(curva.getPoints(40), seg);
    if (achata !== 1) g.scale(1, 1, achata);
    g.computeVertexNormals();
    return g;
  }
  // tronco: anel com raio por altura, achatado na frente/trás
  function anel(perfil, rx, rz, seg = 28) {
    const pts = perfil.map(([y, r]) => new T.Vector2(r, y));
    const g = new T.LatheGeometry(new T.SplineCurve(pts).getPoints(40), seg);
    g.scale(rx, 1, rz);
    g.computeVertexNormals();
    return g;
  }
  const esfera = (r, sx = 1, sy = 1, sz = 1) => { const g = new T.SphereGeometry(r, 24, 18); g.scale(sx, sy, sz); return g; };
  function malha(g, m, pai, x = 0, y = 0, z = 0) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; pai.add(o); return o; }
  const no = (pai, x = 0, y = 0, z = 0, ordem = "XYZ") => { const o = new T.Group(); o.position.set(x, y, z); o.rotation.order = ordem; pai.add(o); return o; };

  /* ---------- a personagem ---------- */
  function criarFigura() {
    const f = { raiz: new T.Group() };
    const R = f.raiz; R.rotation.order = "YXZ";
    // quadril (legging de cintura alta) e glúteos
    malha(anel([[-.12, 0], [-.11, .08], [-.06, .158], [0, .172], [.06, .158], [.12, .134]], 1, .68), M.legging, R);
    for (const s of [1, -1]) malha(esfera(.086, 1, .95, .85), M.legging, R, s * .062, -.05, -.06);
    // coluna → abdômen (pele) → peito (top)
    f.coluna = no(R, 0, .11, 0);
    malha(anel([[-.01, .13], [.05, .112], [.11, .104], [.18, .116]], 1, .64), M.pele, f.coluna);
    f.peito = no(f.coluna, 0, .17, 0);
    malha(anel([[-.03, .118], [.06, .13], [.14, .14], [.21, .13], [.25, .1], [.275, .05]], 1, .66), M.top, f.peito);
    malha(esfera(.1, 1.18, .55, .5), M.top, f.peito, 0, .125, .052);
    // pescoço e cabeça
    f.pescoco = no(f.peito, 0, .265, -.01);
    malha(new T.CylinderGeometry(.036, .042, .1, 16), M.pele, f.pescoco, 0, .04, 0);
    f.cabeca = no(f.pescoco, 0, .1, .005);
    malha(esfera(.098, .9, 1.1, 1), M.pele, f.cabeca, 0, .07, 0);
    malha(esfera(.06, .9, .8, .9), M.pele, f.cabeca, 0, .015, .03); // queixo
    malha(new T.ConeGeometry(.013, .03, 10), M.pele, f.cabeca, 0, .06, .1).rotation.x = Math.PI / 2; // nariz
    for (const s of [1, -1]) {
      malha(esfera(.0085, 1.2, .7, .5), M.olho, f.cabeca, s * .032, .082, .09);
      malha(esfera(.018, .5, 1, .8), M.pele, f.cabeca, s * .089, .065, 0); // orelhas
    }
    // cabelo: touca + rabo de cavalo com balanço
    const touca = new T.SphereGeometry(.106, 28, 18, 0, Math.PI * 2, 0, Math.PI * .56);
    touca.scale(.92, 1.1, 1.02);
    const t1 = malha(touca, M.cabelo, f.cabeca, 0, .08, -.016); t1.rotation.x = -.62;
    malha(esfera(.1, .92, 1.04, .86), M.cabelo, f.cabeca, 0, .078, -.034);
    f.rabo = [];
    let pai = no(f.cabeca, 0, .13, -.085);
    malha(esfera(.022), M.top, pai); // elástico do cabelo
    for (let i = 0; i < 4; i++) {
      const s = no(pai, 0, i ? -.06 : -.01, i ? -.004 : -.01);
      malha(esfera(.04 - i * .006, .9, 1.6, .85), M.cabelo, s, 0, -.035, 0);
      f.rabo.push(s); pai = s;
    }
    // braços (ordem ZYX: abre, gira, levanta)
    for (const [lado, s] of [["E", 1], ["D", -1]]) {
      const ombro = no(f.peito, s * .165, .215, -.005, "ZYX");
      malha(membro(.28, [[0, .056], [.18, .054], [.55, .044], [1, .035]], .95), M.pele, ombro);
      const cot = no(ombro, 0, -.28, 0, "XYZ");
      malha(esfera(.033), M.pele, cot);
      malha(membro(.245, [[0, .036], [.2, .04], [.6, .032], [1, .025]], .85), M.pele, cot);
      const mao = no(cot, 0, -.25, 0, "XYZ");
      malha(esfera(.022), M.pele, mao);
      malha(esfera(.036, .75, 1.3, .45), M.pele, mao, 0, -.04, 0);
      malha(esfera(.014, 1, 2, 1), M.pele, mao, s * -.02, -.025, .018).rotation.z = s * .5; // polegar
      f["ombro" + lado] = ombro; f["cotovelo" + lado] = cot; f["mao" + lado] = mao;
      // pernas
      const q = no(R, s * .09, -.045, 0, "ZYX");
      malha(membro(.42, [[0, .09], [.12, .094], [.45, .078], [.8, .058], [1, .05]], .92), M.legging, q);
      const j = no(q, 0, -.42, 0, "XYZ");
      malha(esfera(.05, 1, 1, .95), M.legging, j);
      malha(membro(.41, [[0, .052], [.2, .062], [.5, .048], [1, .034]], .92), M.legging, j);
      const t = no(j, 0, -.41, 0, "XYZ");
      const tenis = new T.CapsuleGeometry(.042, .12, 6, 16); tenis.rotateX(Math.PI / 2); tenis.scale(.95, .85, 1);
      malha(tenis, M.tenis, t, 0, -.042, .04);
      const sola = new T.CapsuleGeometry(.04, .13, 4, 12); sola.rotateX(Math.PI / 2); sola.scale(1, .3, 1); malha(sola, M.sola, t, 0, -.068, .04);
      malha(esfera(.033), M.legging, t, 0, 0, 0);
      f["quadril" + lado] = q; f["joelho" + lado] = j; f["tornozelo" + lado] = t;
      // pontos de contato
      f["calc" + lado] = no(t, 0, -.08, -.06); f["ponta" + lado] = no(t, 0, -.08, .15);
      f["palma" + lado] = no(mao, 0, -.06, 0);
    }
    f.gluteo = no(R, 0, -.1, -.09); f.nuca = no(f.peito, 0, .2, -.1); f.topo = no(f.cabeca, 0, .19, 0);
    f.costas = no(f.peito, 0, .1, -.1); f.barriga = no(f.coluna, 0, .05, .12);
    f.raiz.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return f;
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
    k: [{ qE: [0, 7], qD: [0, 7], oE: [4, 6, -60], oD: [4, 6, -60], cE: 6, cD: 6 },
        { qE: [0, 7], qD: [0, 7], oE: [10, 6, -60], oD: [10, 6, -60], cE: 142, cD: 142 }],
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
    for (const q of ex.k) { aplicar(fig, mix(q, q, 0)); assentar(fig, ex, q, alvo); fig.raiz.updateMatrixWorld(true); caixaT.expandByObject(fig.raiz); }
    grupo.visible = true; grupo.updateMatrixWorld(true); if (grupo.children.length) caixaT.expandByObject(grupo); grupo.visible = false;
    const c = { ex, grupo, extras, caixa: caixaT, alvo };
    cache[nome] = c; return c;
  }
  function enquadrar(c, aspecto) {
    const b = c.caixa, centro = b.getCenter(new T.Vector3()), tam = b.getSize(new T.Vector3());
    const az = (c.ex.cam?.az ?? 40) * D, el = (c.ex.cam?.el ?? 10) * D;
    const raio = Math.max(b.getBoundingSphere(new T.Sphere()).radius, .55);
    const vfov = cam.fov * D, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspecto);
    const dist = raio / Math.sin(Math.min(vfov, hfov) / 2) * (c.ex.zoom || .86);
    cam.aspect = aspecto; cam.updateProjectionMatrix();
    cam.position.set(centro.x + Math.sin(az) * Math.cos(el) * dist, centro.y + Math.sin(el) * dist, centro.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(centro.x, centro.y - tam.y * .02, centro.z);
  }
  // rabo de cavalo com mola
  function balancar(d) {
    const v = mundo(fig.cabeca); const ant = d._cab || v; const vel = v.clone().sub(ant); d._cab = v;
    d._bal = d._bal || { x: 0, z: 0 }; const b = d._bal;
    b.x += (-vel.z * 40 - b.x) * .15; b.z += (vel.x * 40 - b.z) * .15;
    fig.rabo.forEach((s, i) => { s.rotation.x = .25 + b.x * (i + 1) * .25; s.rotation.z = b.z * (i + 1) * .25; });
  }
  function desenhar(d, t) {
    if (!iniciar()) return false;
    const c = preparar(d.nome); if (!c) return false;
    const ex = c.ex, k = ex.k;
    // posição no ciclo com vários quadros
    let pose;
    if (k.length === 2) pose = mix(k[0], k[1], t);
    else { const x = t * k.length, i = Math.floor(x) % k.length, fr = x - Math.floor(x), s = fr * fr * (3 - 2 * fr); pose = mix(k[i], k[(i + 1) % k.length], s); }
    aplicar(fig, pose); assentar(fig, ex, pose, c.alvo);
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
    set(M.pele, c.pele); set(M.top, c.top); set(M.legging, c.legging); set(M.cabelo, c.cabelo);
  }
  window.Figura3D = { desenhar, tem: n => !desligado && !!EX[n], desligar: () => { desligado = true; }, cores, EX, _int: { aplicar, mix, criarFigura } };
})();
