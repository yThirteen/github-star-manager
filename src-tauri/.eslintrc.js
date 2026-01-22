module.exports = {
  rules: {
    'no-unused-vars': [
      'warn',
      { 
        argsIgnorePattern: '^_',   // 忽略函数参数中以下划线开头的
        varsIgnorePattern: '^_',   // 忽略变量中以下划线开头的
        caughtErrorsIgnorePattern: '^_' // 忽略 try/catch 中的错误变量（如 _e）
      }
    ]
  }
}