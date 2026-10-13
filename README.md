# 튼튼몬 키우기

운동하고 골고루 먹으면 자라고, 안 돌보면 시드는 건강 습관 육성 게임입니다. (DEOK TT)

## 실행
```
npm install
npm run dev     # 만들면서 보기 (주소가 뜹니다)
npm test        # 게임 계산 테스트
npm run build   # 배포용 → dist/
```
- 휴대폰에서 주소를 열고 「홈 화면에 추가」 하면 앱처럼 쓰고, 인터넷이 끊겨도 열립니다.
- 기획과 규칙은 [`CLAUDE.md`](CLAUDE.md)에 있습니다.

## 배포 (GitHub + Vercel)
1. vercel.com → Add New → Project → 이 저장소 Import
2. 설정은 `vercel.json` 에 들어 있어 그대로 Deploy 하면 됩니다.
3. 이후 main에 올릴 때마다 자동 배포됩니다.
