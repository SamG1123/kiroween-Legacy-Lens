import { SmellDetector } from './SmellDetector';
import { defaultConfig } from '../config';

describe('SmellDetector', () => {
  let detector: SmellDetector;

  beforeEach(() => {
    detector = new SmellDetector(defaultConfig);
  });

  describe('detectLongMethods', () => {
    it('should detect methods exceeding line threshold', () => {
      const code = `
function veryLongMethod() {
  const line1 = 1;
  const line2 = 2;
  const line3 = 3;
  const line4 = 4;
  const line5 = 5;
  const line6 = 6;
  const line7 = 7;
  const line8 = 8;
  const line9 = 9;
  const line10 = 10;
  const line11 = 11;
  const line12 = 12;
  const line13 = 13;
  const line14 = 14;
  const line15 = 15;
  const line16 = 16;
  const line17 = 17;
  const line18 = 18;
  const line19 = 19;
  const line20 = 20;
  const line21 = 21;
  const line22 = 22;
  const line23 = 23;
  const line24 = 24;
  const line25 = 25;
  const line26 = 26;
  const line27 = 27;
  const line28 = 28;
  const line29 = 29;
  const line30 = 30;
  const line31 = 31;
  const line32 = 32;
  const line33 = 33;
  const line34 = 34;
  const line35 = 35;
  const line36 = 36;
  const line37 = 37;
  const line38 = 38;
  const line39 = 39;
  const line40 = 40;
  const line41 = 41;
  const line42 = 42;
  const line43 = 43;
  const line44 = 44;
  const line45 = 45;
  const line46 = 46;
  const line47 = 47;
  const line48 = 48;
  const line49 = 49;
  const line50 = 50;
  const line51 = 51;
}
      `;

      const smells = detector.detectLongMethods(code);
      expect(smells.length).toBeGreaterThan(0);
      expect(smells[0].methodName).toBe('veryLongMethod');
      expect(smells[0].lineCount).toBeGreaterThan(defaultConfig.longMethodThreshold);
    });

    it('should not detect short methods', () => {
      const code = `
function shortMethod() {
  return 42;
}
      `;

      const smells = detector.detectLongMethods(code);
      expect(smells.length).toBe(0);
    });
  });

  describe('detectDuplication', () => {
    it('should detect duplicate code blocks', () => {
      const code = `
function method1() {
  const x = 1;
  const y = 2;
  const z = x + y;
  console.log(z);
  return z;
}

function method2() {
  const x = 1;
  const y = 2;
  const z = x + y;
  console.log(z);
  return z;
}
      `;

      const smells = detector.detectDuplication(code);
      expect(smells.length).toBeGreaterThan(0);
      expect(smells[0].similarity).toBeGreaterThanOrEqual(defaultConfig.duplicationThreshold);
    });

    it('should not detect unique code', () => {
      const code = `
function method1() {
  return 1;
}

function method2() {
  return 2;
}
      `;

      const smells = detector.detectDuplication(code);
      expect(smells.length).toBe(0);
    });
  });

  describe('detectComplexConditionals', () => {
    it('should detect deeply nested conditionals', () => {
      const code = `
function complexMethod() {
  if (condition1) {
    if (condition2) {
      if (condition3) {
        if (condition4) {
          if (condition5) {
            if (condition6) {
              doSomething();
            }
          }
        }
      }
    }
  }
}
      `;

      const smells = detector.detectComplexConditionals(code);
      expect(smells.length).toBeGreaterThan(0);
      expect(smells[0].type).toBe('complex_conditional');
    });

    it('should detect switch statements with many cases', () => {
      const code = `
function switchMethod(value: number) {
  switch (value) {
    case 1: return 'one';
    case 2: return 'two';
    case 3: return 'three';
    case 4: return 'four';
    case 5: return 'five';
    case 6: return 'six';
    case 7: return 'seven';
    case 8: return 'eight';
    case 9: return 'nine';
    case 10: return 'ten';
    case 11: return 'eleven';
    case 12: return 'twelve';
    default: return 'other';
  }
}
      `;

      const smells = detector.detectComplexConditionals(code);
      expect(smells.length).toBeGreaterThan(0);
    });
  });

  describe('detectPoorNaming', () => {
    it('should detect single-letter variable names', () => {
      const code = `
function test() {
  const a = 1;
  const b = 2;
  return a + b;
}
      `;

      const smells = detector.detectPoorNaming(code);
      expect(smells.length).toBeGreaterThan(0);
      expect(smells.some(s => s.identifierName === 'a')).toBe(true);
    });

    it('should detect generic variable names', () => {
      const code = `
function test() {
  const data = fetchData();
  const temp = processData(data);
  return temp;
}
      `;

      const smells = detector.detectPoorNaming(code);
      expect(smells.length).toBeGreaterThan(0);
    });

    it('should not flag common loop counters', () => {
      const code = `
function processItems() {
  for (let i = 0; i < 10; i++) {
    console.log(i);
  }
}
      `;

      const smells = detector.detectPoorNaming(code);
      // Should only flag the function name if at all, not the loop counter
      expect(smells.every(s => s.identifierName !== 'i')).toBe(true);
    });
  });

  describe('detectSOLIDViolations', () => {
    it('should detect SRP violations in classes with many methods', () => {
      const code = `
class GodClass {
  method1() {}
  method2() {}
  method3() {}
  method4() {}
  method5() {}
  method6() {}
  method7() {}
  method8() {}
  method9() {}
  method10() {}
  method11() {}
  method12() {}
  method13() {}
  method14() {}
  method15() {}
  method16() {}
}
      `;

      const smells = detector.detectSOLIDViolations(code);
      expect(smells.length).toBeGreaterThan(0);
      expect(smells.some(s => s.principle === 'SRP')).toBe(true);
    });

    it('should detect DIP violations with many concrete instantiations', () => {
      const code = `
class TightlyCoupled {
  constructor() {
    const obj1 = new ConcreteClass1();
    const obj2 = new ConcreteClass2();
    const obj3 = new ConcreteClass3();
    const obj4 = new ConcreteClass4();
    const obj5 = new ConcreteClass5();
    const obj6 = new ConcreteClass6();
  }
}
      `;

      const smells = detector.detectSOLIDViolations(code);
      expect(smells.length).toBeGreaterThan(0);
      expect(smells.some(s => s.principle === 'DIP')).toBe(true);
    });
  });
});
