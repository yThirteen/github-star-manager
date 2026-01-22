; 自定义 NSIS 安装程序脚本
; 保存用户选择的语言

Section "MainSection" SEC01
  ; 这个 section 是必需的，即使为空
SectionEnd

!macro customInstall
  ; 保存用户选择的语言到文件
  ${If} $LANGUAGE == 2052  ; 简体中文
    FileOpen $0 "$INSTDIR\install-language.txt" w
    FileWrite $0 "zh-CN"
    FileClose $0
  ${Else}
    FileOpen $0 "$INSTDIR\install-language.txt" w
    FileWrite $0 "en"
    FileClose $0
  ${EndIf}
!macroend

!macro customUnInstall
  ; 卸载时删除语言文件
  Delete "$INSTDIR\install-language.txt"
!macroend

!macro customLanguageInit
  ; 语言初始化
!macroend
