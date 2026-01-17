/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

type CompareFunction = (a: number, b: number) => number;

export function initSTree(a: number[]): number[] {
  const al = a.length;
  let tl: number;

  if ((al & (al - 1)) === 0) {
    tl = 2 * al - 1;
  } else {
    const p = Math.floor(Math.log(al) / Math.log(2));
    const power = Math.pow(2, p + 1);
    tl = 2 * power - 1;
  }

  return new Array(tl);
}

function getRightChildIdx(idx: number): number {
  return 2 * idx + 2;
}

function getLeftChildIdx(idx: number): number {
  return 2 * idx + 1;
}

function buildSTree_(
  T: number[],
  a: number[],
  leftIdx: number,
  rightIdx: number,
  p: number,
  cmp: CompareFunction,
): void {
  if (leftIdx === rightIdx) {
    const v = a[leftIdx];
    T[p] = isNaN(v) ? 0 : v;
    return;
  }

  const middleIdx = Math.floor((leftIdx + rightIdx) / 2);
  buildSTree_(T, a, leftIdx, middleIdx, getLeftChildIdx(p), cmp);
  buildSTree_(T, a, middleIdx + 1, rightIdx, getRightChildIdx(p), cmp);

  T[p] = cmp(T[getLeftChildIdx(p)], T[getRightChildIdx(p)]);
}

export function buildSTree(
  T: number[],
  a: number[],
  cmp: CompareFunction,
): void {
  buildSTree_(T, a, 0, a.length - 1, 0, cmp);
}

function querySTree_(
  T: number[],
  qLeftIdx: number,
  qRightIdx: number,
  leftIdx: number,
  rightIdx: number,
  p: number,
  cmp: CompareFunction,
  fail: number,
): number {
  if (qLeftIdx <= leftIdx && qRightIdx >= rightIdx) return T[p];

  if (qLeftIdx > rightIdx || qRightIdx < leftIdx) return fail;

  const middleIdx = Math.floor((leftIdx + rightIdx) / 2);
  const leftResult = querySTree_(
    T,
    qLeftIdx,
    qRightIdx,
    leftIdx,
    middleIdx,
    getLeftChildIdx(p),
    cmp,
    fail,
  );
  const rightResult = querySTree_(
    T,
    qLeftIdx,
    qRightIdx,
    middleIdx + 1,
    rightIdx,
    getRightChildIdx(p),
    cmp,
    fail,
  );

  return cmp(leftResult, rightResult);
}

export function querySTree(
  T: number[],
  len: number,
  leftIdx: number,
  rightIdx: number,
  cmp: CompareFunction,
  fail: number,
): number {
  return querySTree_(T, leftIdx, rightIdx, 0, len - 1, 0, cmp, fail);
}
