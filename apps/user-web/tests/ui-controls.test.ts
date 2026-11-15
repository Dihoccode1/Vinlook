import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../../packages/ui/src/components/button';
import { Input } from '../../../packages/ui/src/components/input';
import { NativeSelect } from '../../../packages/ui/src/components/native-select';
import { Textarea } from '../../../packages/ui/src/components/textarea';

test('custom UI controls preserve native form submission, disabled buttons and values', async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById('root')!);
  let submits = 0;
  t.after(async () => {
    await act(() => root.unmount());
    Object.assign(globalThis, previous, { IS_REACT_ACT_ENVIRONMENT: false });
    dom.window.close();
  });
  await act(() =>
    root.render(
      createElement(
        'form',
        {
          onSubmit: (e) => {
            e.preventDefault();
            submits++;
          },
        },
        createElement(Input, {
          appearance: 'custom',
          name: 'name',
          defaultValue: 'Vinlook',
          required: true,
        }),
        createElement(
          NativeSelect,
          { name: 'language', defaultValue: 'vi' },
          createElement('option', { value: 'vi' }, 'Tiếng Việt'),
        ),
        createElement(Textarea, { name: 'description', defaultValue: 'Narration' }),
        createElement(Button, { variant: 'custom', type: 'submit' }, 'Save'),
        createElement(Button, { variant: 'custom', type: 'button', disabled: true }, 'Disabled'),
      ),
    ),
  );
  const buttons = document.querySelectorAll('button');
  await act(() => buttons[0].click());
  assert.equal(submits, 1);
  await act(() => buttons[1].click());
  assert.equal(submits, 1);
  const form = new dom.window.FormData(document.querySelector('form')!);
  assert.equal(form.get('name'), 'Vinlook');
  assert.equal(form.get('language'), 'vi');
  assert.equal(form.get('description'), 'Narration');
});
