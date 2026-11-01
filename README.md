# 퇴근길 학교 (가칭)

초등 선생님을 위한 웹 기반 3D 쉼터예요. 로그인 없이 들어와서, 노을 진 운동장을 천천히 걸으며 쉬어 가는 공간입니다.

- Vite + React + TypeScript
- three, @react-three/fiber, @react-three/drei
- 서버·DB·외부 모델/텍스처 파일 없음. 모든 물체는 기본 도형으로 코드에서 만듭니다.
  (글꼴만 Pretendard 웹폰트를 CDN에서 불러오고, 실패하면 시스템 글꼴을 씁니다.)

## 실행 방법

Node.js 20 이상이 필요해요. 레포를 받은 폴더에서 실행합니다.

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 을 열면 됩니다.

### 폰으로 접속해 보기

PC와 폰이 **같은 와이파이**에 있어야 해요.

```bash
npm run dev -- --host
```

터미널에 나오는 `Network: http://192.168.x.x:5173/` 주소를 폰 브라우저에 입력하세요.

### 빌드 / 미리보기

```bash
npm run build
```

```bash
npm run preview
```

## 조작

- 바닥을 클릭(폰은 탭)하면 캐릭터가 그 지점으로 걸어가요.
- PC에서는 마우스 휠로 확대/축소할 수 있어요. 카메라 회전은 일부러 넣지 않았어요.

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml` 이 자동으로 빌드해서 GitHub Pages에 올립니다.
배포 주소: **https://gmeann.github.io/getoffschool/**

처음 한 번만 설정이 필요해요.

1. GitHub 레포 → **Settings → Pages**
2. **Build and deployment → Source** 를 **GitHub Actions** 로 선택
3. Actions 탭에서 실패한 실행이 있으면 **Re-run all jobs** (또는 **Run workflow**) 를 누르면 배포됩니다.

### 레포 이름(base 경로) 바꾸기

- 워크플로는 레포 이름을 자동으로 읽어서 `BASE_PATH=/<레포이름>/` 로 빌드해요. 레포 이름을 바꿔도 따로 고칠 것이 없어요.
- 직접 빌드할 때는 `vite.config.ts` 의 `REPO_NAME` 상수를 고치거나, 환경변수로 덮어쓰면 됩니다.

```bash
BASE_PATH=/my-repo/ npm run build
```

## 폴더 구조

```
src/
  components/  3D 물체(하늘, 바닥, 나무, 가로등, 벤치, 캐릭터, 카메라)와 HUD
  scenes/      장면 조립 (Playground = 운동장)
  hooks/       클릭 이동 + 충돌 처리 (useClickToMove)
  data/        이름표 목록, 운동장 배치·충돌 영역

```
