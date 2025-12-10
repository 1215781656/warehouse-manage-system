const { run: runItemCode } = require('./item_code.test')
const { run: runOutReset } = require('./out_form_reset.test')

;(async () => {
  try {
    await runItemCode()
    await runOutReset()
    console.log('所有测试通过')
    process.exit(0)
  } catch (e) {
    console.error('测试失败:', e && e.message ? e.message : e)
    process.exit(1)
  }
})()
