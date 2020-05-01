
import {DiscTest} from './disc_test.js';
import {MathUtilsTest} from './math_utils_test.js';

window.runTests = () => {
  for (let testSuite of [new DiscTest(), new MathUtilsTest()]) {
    testSuite.runTests(
        (name) => {
          let div = document.createElement('div');
          div.className = 'success';
          div.innerText =
              '[SUCCESS] ' + testSuite.constructor.name + ' ' + name;
          document.getElementById('output').appendChild(div);
        },
        (name, error) => {
          let div = document.createElement('div');
          div.className = 'error';
          div.innerText = '[ERROR] ' + testSuite.constructor.name + ' ' + name +
                          '\n\n' + error.stack;
          document.getElementById('output').appendChild(div);
        })
  }
};
