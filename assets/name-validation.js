/* Original resource recovered statically; see analysis/native/BANWORDS_NATIVE_SEMANTICS.md. */
(function(global){'use strict';
const words=Object.freeze(["毛泽东", "周恩来", "刘少奇", "邓小平", "江泽民", "周恩來", "毛澤東", "鄧小平", "习近平", "李克强", "彭丽圆", "共产党", "劉少奇", "江澤民", "習近平", "李克強", "彭麗圓", "共產黨", "习大大", "習大大", "彭丽媛", "彭麗媛"]);
const stripPattern="[\u0000- \\[\\]-ÿ\\\\~!@#$%^&*()_+\\-=【】、{}|;':\"，。、《》？αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝≈≡≠＝≤≥＜＞≮≯∷±＋－×÷／∫∮∝∞∧∨∑∏∪∩∈∵∴⊥∥∠⌒⊙≌∽√§№☆★○●◎◇◆□℃‰€■△▲※→←↑↓〓¤°＃＆＠＼︿＿￣―♂♀┌┍┎┐┑┒┓─┄┈├┝┞┟┠┡┢┣│┆┊┬┭┮┯┰┱┲┳┼┽┾┿╀╁╂╃└┕┖┗┘┙┚┛━┅┉┤┥┦┧┨┩┪┫┃┇┋┴┵┶┷┸┹┺┻╋╊╉╈╇╆╅╄]";
const strip=new RegExp(stripPattern,'g');
function hasBanWords(value){
  if(value==null || value==='') return false;
  const normalized=String(value).toLowerCase().replace(strip,'');
  return words.some(word=>normalized.includes(word));
}
global.SDDYXNameValidation=Object.freeze({hasBanWords,words,stripPattern});
})(typeof globalThis!=='undefined'?globalThis:this);
