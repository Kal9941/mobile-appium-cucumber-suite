import { sharedConfig } from './wdio.shared.conf.js'
import { loadEnv } from './tests/support/loadEnv.js'

const env = loadEnv()

export const config = {
  ...sharedConfig,

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': env.device.name || 'Android Emulator',
      'appium:udid': env.device.udid || undefined,
      'appium:platformVersion': env.device.platformVersion || undefined,
      // O APK é instalado pelo `onPrepare` (tests/support/apk.js), uma vez por execução;
      // o Appium só abre o app já instalado.
      'appium:appPackage': env.app.appPackage,
      'appium:appActivity': env.app.appActivity,
      // O reset de estado é feito pelo próprio framework a cada cenário
      // (tests/support/appLifecycle.js), então o Appium não deve resetar sozinho.
      'appium:noReset': true,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 120,
    },
  ],
}
