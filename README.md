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
- **뛰기**: 트랙을 따라 계속 달려요. 다시 누르거나(멈추기) 바닥을 클릭하면 멈춰요.
- **앉기**: 가장 가까운 벤치로 걸어가 앉아요. 앉아 있는 동안 카메라가 조금 가까이 와요. 다시 누르면 일어나요.
- **하늘 보기**: 카메라가 천천히 하늘을 올려다봐요. 다시 누르거나 움직이면 원래대로 돌아와요.
- PC에서는 마우스 휠로 확대/축소할 수 있어요. 카메라 회전은 일부러 넣지 않았어요.

## 운동장 이야기

- **시간대별 하늘**: 기기 시각에 따라 오전·낮·저녁(노을)·밤으로 하늘과 조명이 바뀌어요. 시간대 사이는 부드럽게 이어져요.
- **그림자 선생님**: 반투명한 흰빛 선생님 6~8명이 트랙을 걷거나 뛰고, 1~2명은 벤치에 앉아 있어요. 가까이 가면 말을 걸어요.
- **걸음 카운터**: 이동한 거리를 트랙 한 바퀴(약 70m) 기준으로 "오늘 나는 N바퀴"로 보여 줘요. 한 바퀴마다 "한 바퀴 완주!", 10바퀴를 채우면 "운동장 10바퀴" 칭호가 생겨요.
  - 저장 위치: 브라우저 localStorage (`getoffschool:meters:날짜`, `getoffschool:titles`). 서버에는 아무것도 보내지 않아요.

### 개발용: 시간대 강제로 바꾸기

주소 뒤에 `?time=` 을 붙이면 돼요.

- `http://localhost:5173/?time=morning` (오전)
- `http://localhost:5173/?time=day` (낮)
- `http://localhost:5173/?time=evening` (저녁)
- `http://localhost:5173/?time=night` (밤)
- 숫자도 돼요: `?time=17.5` (오후 5시 30분)

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
  hooks/       내 캐릭터 상태·이동(playerStore), 바퀴 수 저장(lapStore), 시간대(useTimeOfDay)
  data/        이름표·그림자 대사 목록, 시간대 색, 운동장 배치·충돌 영역

```
