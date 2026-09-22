const fs = require("fs");

function assertReplace(text, from, to, label) {
  if (!text.includes(from)) {
    throw new Error("No encontre: " + label);
  }
  return text.replace(from, to);
}

fs.writeFileSync(
  "app/whatsapp-qr-server/bot/catalogo.mjs",
  Buffer.from("aW1wb3J0IHBnIGZyb20gInBnIjsKaW1wb3J0IHBhdGggZnJvbSAibm9kZTpwYXRoIjsKCmNvbnN0IHsgUG9vbCB9ID0gcGc7Cgpjb25zdCBwb29sID0gbmV3IFBvb2woewogIGNvbm5lY3Rpb25TdHJpbmc6IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCwKfSk7Cgpjb25zdCBTVE9SQUdFX0RJUiA9CiAgcHJvY2Vzcy5lbnYuQ0FUQUxPR09fU1RPUkFHRV9ESVIgfHwKICBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgInN0b3JhZ2UiLCAiY2F0YWxvZ28iKTsKCmNvbnN0IExFR0FDWV9FTVBSRVNBX0lEID0gTnVtYmVyKAogIHByb2Nlc3MuZW52LkNBVEFMT0dPX0xFR0FDWV9FTVBSRVNBX0lEIHx8IDEKKTsKCmV4cG9ydCBjb25zdCBQUk9EVUNUT1MgPSBbCiAgewogICAgc2x1ZzogInNpZXJyYS1ib212aW5rLTgiLAogICAgbm9tYnJlOiAiU2llcnJhIEluYWxhbWJyaWNhIEJPTVZJTksgOCBwdWxnYWRhcyIsCiAgICBhbGlhc2VzOiBbCiAgICAgICJzaWVycmEiLAogICAgICAic2llcnJhIGJvbXZpbmsiLAogICAgICAiYm9tdmluayIsCiAgICAgICJzaWVycmEgOCIsCiAgICAgICJzaWVycmEgZGUgOCBwdWxnYWRhcyIsCiAgICBdLAogICAgcHJlY2lvOiAyNDksCiAgICBwcmVjaW9BbnRlczogMjk5LAogICAgZGVzY3JpcGNpb246CiAgICAgICJTaWVycmEgaW5hbGFtYnJpY2EgcHJvZmVzaW9uYWwgaWRlYWwgcGFyYSBwb2RhLCBtYWRlcmEsIHRyYWJham9zIGRlIGNhbXBvIHkgdXNvIGNvbnRpbnVvLiIsCiAgICBiZW5lZmljaW9zOiBbCiAgICAgICIyMVYgZGUgcG90ZW5jaWEiLAogICAgICAiSW5jbHV5ZSAyIGJhdGVyaWFzIiwKICAgICAgIkVzcGFkYSBkZSA4IHB1bGdhZGFzIiwKICAgICAgIkNvcnRlIHJhcGlkbyB5IHByZWNpc28iLAogICAgICAiSWRlYWwgcGFyYSBwb2RhIHkgbWFkZXJhIiwKICAgICAgIkRpc2VubyBlcmdvbm9taWNvIiwKICAgIF0sCiAgICBjYXJhY3RlcmlzdGljYXM6IFtdLAogICAgdXNvczogW10sCiAgICBpbmNsdXllOiBbXSwKICAgIGdhcmFudGlhOiBudWxsLAogICAgc3RvY2s6IG51bGwsCiAgICBwcm9tb2Npb25lczogW10sCiAgICBtdWx0aW1lZGlhOiB7CiAgICAgIGZvdG9zOiBbCiAgICAgICAgImFwcC93aGF0c2FwcC1xci1zZXJ2ZXIvbWVkaWEtY2F0YWxvZ28vc2llcnJhLWJvbXZpbmstOC9mb3Rvcy9XaGF0c0FwcCBJbWFnZSAyMDI2LTA4LTI1IGF0IDExLjM2LjU1IEFNLmpwZWciLAogICAgICBdLAogICAgICB2aWRlb3M6IFsKICAgICAgICAiYXBwL3doYXRzYXBwLXFyLXNlcnZlci9tZWRpYS1jYXRhbG9nby9zaWVycmEtYm9tdmluay04L3ZpZGVvcy9WSURFTyAzLm1wNCIsCiAgICAgIF0sCiAgICAgIGF1ZGlvczogW10sCiAgICAgIGdpZnM6IFtdLAogICAgfSwKICAgIG9yaWdlbjogImxlZ2FjeSIsCiAgfSwKICB7CiAgICBzbHVnOiAic29wb3J0ZS10ZWxlc2NvcGljby14dGQiLAogICAgbm9tYnJlOiAiU29wb3J0ZSBUZWxlc2NvcGljbyBYVEQgcGFyYSBBbW9sYWRvcmEiLAogICAgYWxpYXNlczogWwogICAgICAic29wb3J0ZSIsCiAgICAgICJzb3BvcnRlIHRlbGVzY29waWNvIiwKICAgICAgInh0ZCIsCiAgICAgICJzb3BvcnRlIHBhcmEgYW1vbGFkb3JhIiwKICAgIF0sCiAgICBwcmVjaW86IDIwOSwKICAgIHByZWNpb0FudGVzOiAyNDksCiAgICBkZXNjcmlwY2lvbjoKICAgICAgIlNvcG9ydGUgdGVsZXNjb3BpY28gcGFyYSBhbW9sYWRvcmEsIGlkZWFsIHBhcmEgY29ydGVzIG1hcyBwcmVjaXNvcywgc2VndXJvcyB5IHByb2Zlc2lvbmFsZXMuIiwKICAgIGJlbmVmaWNpb3M6IFsKICAgICAgIkJhc2UgZGUgaGllcnJvIHJlc2lzdGVudGUiLAogICAgICAiU29wb3J0ZXMgY29uIGFqdXN0ZSB2YXJpYWJsZSIsCiAgICAgICJNYXlvciBzZWd1cmlkYWQgYWwgY29ydGFyIiwKICAgICAgIlByb3RlY2Npb24gY29udHJhIGNoaXNwYXMgaW50ZWdyYWRhIiwKICAgICAgIkNvbXBhdGlibGUgY29uIGRpc2NvcyBkZSAxMTUgeSAxMjUgbW0iLAogICAgICAiTm8gaW5jbHV5ZSBhbW9sYWRvcmEiLAogICAgXSwKICAgIGNhcmFjdGVyaXN0aWNhczogW10sCiAgICB1c29zOiBbXSwKICAgIGluY2x1eWU6IFtdLAogICAgZ2FyYW50aWE6IG51bGwsCiAgICBzdG9jazogbnVsbCwKICAgIHByb21vY2lvbmVzOiBbXSwKICAgIG11bHRpbWVkaWE6IHsgZm90b3M6IFtdLCB2aWRlb3M6IFtdLCBhdWRpb3M6IFtdLCBnaWZzOiBbXSB9LAogICAgb3JpZ2VuOiAibGVnYWN5IiwKICB9LApdOwoKZnVuY3Rpb24gbm9ybWFsaXphcih0ZXh0bykgewogIHJldHVybiBTdHJpbmcodGV4dG8gfHwgIiIpCiAgICAubm9ybWFsaXplKCJORkQiKQogICAgLnJlcGxhY2UoL1tcdTAzMDAtXHUwMzZmXS9nLCAiIikKICAgIC50b0xvd2VyQ2FzZSgpCiAgICAudHJpbSgpOwp9CgpmdW5jdGlvbiBudW1lcm8odmFsb3IpIHsKICBpZiAodmFsb3IgPT09IG51bGwgfHwgdmFsb3IgPT09IHVuZGVmaW5lZCB8fCB2YWxvciA9PT0gIiIpIHJldHVybiBudWxsOwogIGNvbnN0IG4gPSBOdW1iZXIodmFsb3IpOwogIHJldHVybiBOdW1iZXIuaXNGaW5pdGUobikgPyBuIDogbnVsbDsKfQoKY29uc3QgUEFMQUJSQVNfSUdOT1JBREFTID0gbmV3IFNldChbCiAgInBhcmEiLAogICJjb24iLAogICJzaW4iLAogICJkZWwiLAogICJsYXMiLAogICJsb3MiLAogICJ1bmEiLAogICJ1bm8iLAogICJ1bm9zIiwKICAidW5hcyIsCiAgInBvciIsCiAgImRlc2RlIiwKICAiaGFzdGEiLAogICJwcm9kdWN0byIsCl0pOwoKZnVuY3Rpb24gY29uc3RydWlyQWxpYXNlcyhwcm9kdWN0bykgewogIGNvbnN0IGNhbmRpZGF0b3MgPSBbCiAgICBwcm9kdWN0by5ub21icmUsCiAgICBwcm9kdWN0by5zbHVnLAogICAgcHJvZHVjdG8uc2t1LAogIF07CgogIGNvbnN0IHBhbGFicmFzID0gbm9ybWFsaXphcihwcm9kdWN0by5ub21icmUpCiAgICAuc3BsaXQoL1teYS16MC05XSsvKQogICAgLmZpbHRlcigKICAgICAgKHApID0+CiAgICAgICAgcC5sZW5ndGggPj0gNCAmJgogICAgICAgICFQQUxBQlJBU19JR05PUkFEQVMuaGFzKHApICYmCiAgICAgICAgIS9eXGQrJC8udGVzdChwKQogICAgKTsKCiAgY2FuZGlkYXRvcy5wdXNoKC4uLnBhbGFicmFzKTsKCiAgcmV0dXJuIFsKICAgIC4uLm5ldyBTZXQoCiAgICAgIGNhbmRpZGF0b3MKICAgICAgICAubWFwKCh4KSA9PiBub3JtYWxpemFyKHgpKQogICAgICAgIC5maWx0ZXIoQm9vbGVhbikKICAgICksCiAgXTsKfQoKZnVuY3Rpb24gcnV0YU11bHRpbWVkaWEodXJsKSB7CiAgY29uc3QgdmFsb3IgPSBTdHJpbmcodXJsIHx8ICIiKS50cmltKCk7CiAgaWYgKCF2YWxvcikgcmV0dXJuIG51bGw7CiAgaWYgKHBhdGguaXNBYnNvbHV0ZSh2YWxvcikpIHJldHVybiB2YWxvcjsKICByZXR1cm4gcGF0aC5qb2luKFNUT1JBR0VfRElSLCB2YWxvcik7Cn0KCmZ1bmN0aW9uIHByb2R1Y3RvRGVzZGVGaWxhKHJvdykgewogIGNvbnN0IHByb21vY2lvbmVzID0gQXJyYXkuaXNBcnJheShyb3cucHJvbW9jaW9uZXMpCiAgICA/IHJvdy5wcm9tb2Npb25lcy5tYXAoKHApID0+ICh7CiAgICAgICAgY2FudGlkYWQ6IE51bWJlcihwLmNhbnRpZGFkKSwKICAgICAgICBwcmVjaW86IE51bWJlcihwLnByZWNpbyksCiAgICAgICAgdGV4dG86IHAudGV4dG8gfHwgbnVsbCwKICAgICAgfSkpCiAgICA6IFtdOwoKICBjb25zdCBtZWRpYSA9IEFycmF5LmlzQXJyYXkocm93Lm11bHRpbWVkaWEpCiAgICA/IHJvdy5tdWx0aW1lZGlhCiAgICA6IFtdOwoKICBjb25zdCBtdWx0aW1lZGlhID0gewogICAgZm90b3M6IG1lZGlhCiAgICAgIC5maWx0ZXIoKG0pID0+IG0udGlwbyA9PT0gImZvdG8iKQogICAgICAubWFwKChtKSA9PiBydXRhTXVsdGltZWRpYShtLnVybCkpCiAgICAgIC5maWx0ZXIoQm9vbGVhbiksCiAgICB2aWRlb3M6IG1lZGlhCiAgICAgIC5maWx0ZXIoKG0pID0+IG0udGlwbyA9PT0gInZpZGVvIikKICAgICAgLm1hcCgobSkgPT4gcnV0YU11bHRpbWVkaWEobS51cmwpKQogICAgICAuZmlsdGVyKEJvb2xlYW4pLAogICAgYXVkaW9zOiBtZWRpYQogICAgICAuZmlsdGVyKChtKSA9PiBtLnRpcG8gPT09ICJhdWRpbyIpCiAgICAgIC5tYXAoKG0pID0+IHJ1dGFNdWx0aW1lZGlhKG0udXJsKSkKICAgICAgLmZpbHRlcihCb29sZWFuKSwKICAgIGdpZnM6IG1lZGlhCiAgICAgIC5maWx0ZXIoKG0pID0+IG0udGlwbyA9PT0gImdpZiIpCiAgICAgIC5tYXAoKG0pID0+IHJ1dGFNdWx0aW1lZGlhKG0udXJsKSkKICAgICAgLmZpbHRlcihCb29sZWFuKSwKICB9OwoKICBjb25zdCBwcm9kdWN0byA9IHsKICAgIGlkOiByb3cuaWQsCiAgICBlbXByZXNhSWQ6IHJvdy5lbXByZXNhX2lkLAogICAgc2x1Zzogcm93LnNsdWcsCiAgICBub21icmU6IHJvdy5ub21icmUsCiAgICBza3U6IHJvdy5za3UgfHwgbnVsbCwKICAgIHByZWNpbzogTnVtYmVyKHJvdy5wcmVjaW8pLAogICAgcHJlY2lvQW50ZXM6IG51bWVybyhyb3cucHJlY2lvX2FudGVyaW9yKSwKICAgIGRlc2NyaXBjaW9uOiByb3cuZGVzY3JpcGNpb24gfHwgbnVsbCwKICAgIGNhcmFjdGVyaXN0aWNhczogQXJyYXkuaXNBcnJheShyb3cuY2FyYWN0ZXJpc3RpY2FzKQogICAgICA/IHJvdy5jYXJhY3RlcmlzdGljYXMKICAgICAgOiBbXSwKICAgIHVzb3M6IEFycmF5LmlzQXJyYXkocm93LnVzb3MpID8gcm93LnVzb3MgOiBbXSwKICAgIGluY2x1eWU6IEFycmF5LmlzQXJyYXkocm93LmluY2x1eWUpID8gcm93LmluY2x1eWUgOiBbXSwKICAgIGdhcmFudGlhOiByb3cuZ2FyYW50aWEgfHwgbnVsbCwKICAgIHN0b2NrOiBudW1lcm8ocm93LnN0b2NrKSwKICAgIHByb21vY2lvbmVzLAogICAgbXVsdGltZWRpYSwKICAgIG9yaWdlbjogImRiIiwKICB9OwoKICBwcm9kdWN0by5iZW5lZmljaW9zID0gWwogICAgLi4ucHJvZHVjdG8uY2FyYWN0ZXJpc3RpY2FzLAogICAgLi4ucHJvZHVjdG8udXNvcywKICBdOwoKICBwcm9kdWN0by5hbGlhc2VzID0gY29uc3RydWlyQWxpYXNlcyhwcm9kdWN0byk7CgogIHJldHVybiBwcm9kdWN0bzsKfQoKYXN5bmMgZnVuY3Rpb24gb2J0ZW5lclByb2R1Y3Rvc0RCKGVtcHJlc2FJZCkgewogIGNvbnN0IGlkID0gTnVtYmVyKGVtcHJlc2FJZCk7CiAgaWYgKCFpZCkgcmV0dXJuIFtdOwoKICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KAogICAgYAogICAgU0VMRUNUCiAgICAgIHAuaWQsCiAgICAgIHAuZW1wcmVzYV9pZCwKICAgICAgcC5ub21icmUsCiAgICAgIHAuc2x1ZywKICAgICAgcC5za3UsCiAgICAgIHAucHJlY2lvLAogICAgICBwLnByZWNpb19hbnRlcmlvciwKICAgICAgcC5kZXNjcmlwY2lvbiwKICAgICAgcC5jYXJhY3RlcmlzdGljYXMsCiAgICAgIHAudXNvcywKICAgICAgcC5pbmNsdXllLAogICAgICBwLmdhcmFudGlhLAogICAgICBwLnN0b2NrLAogICAgICBDT0FMRVNDRSgKICAgICAgICAoCiAgICAgICAgICBTRUxFQ1QganNvbl9hZ2coCiAgICAgICAgICAgIGpzb25fYnVpbGRfb2JqZWN0KAogICAgICAgICAgICAgICdjYW50aWRhZCcsIHBwLmNhbnRpZGFkLAogICAgICAgICAgICAgICdwcmVjaW8nLCBwcC5wcmVjaW8sCiAgICAgICAgICAgICAgJ3RleHRvJywgcHAudGV4dG8KICAgICAgICAgICAgKQogICAgICAgICAgICBPUkRFUiBCWSBwcC5vcmRlbiBBU0MsIHBwLmNhbnRpZGFkIEFTQwogICAgICAgICAgKQogICAgICAgICAgRlJPTSBwcm9kdWN0b19wcm9tb2Npb25lcyBwcAogICAgICAgICAgV0hFUkUgcHAucHJvZHVjdG9faWQgPSBwLmlkCiAgICAgICAgICAgIEFORCBwcC5lbXByZXNhX2lkID0gcC5lbXByZXNhX2lkCiAgICAgICAgICAgIEFORCBwcC5hY3Rpdm8gPSB0cnVlCiAgICAgICAgKSwKICAgICAgICAnW10nOjpqc29uCiAgICAgICkgQVMgcHJvbW9jaW9uZXMsCiAgICAgIENPQUxFU0NFKAogICAgICAgICgKICAgICAgICAgIFNFTEVDVCBqc29uX2FnZygKICAgICAgICAgICAganNvbl9idWlsZF9vYmplY3QoCiAgICAgICAgICAgICAgJ3RpcG8nLCBwbS50aXBvLAogICAgICAgICAgICAgICd1cmwnLCBwbS51cmwsCiAgICAgICAgICAgICAgJ29yZGVuJywgcG0ub3JkZW4KICAgICAgICAgICAgKQogICAgICAgICAgICBPUkRFUiBCWSBwbS5vcmRlbiBBU0MsIHBtLmlkIEFTQwogICAgICAgICAgKQogICAgICAgICAgRlJPTSBwcm9kdWN0b19tdWx0aW1lZGlhIHBtCiAgICAgICAgICBXSEVSRSBwbS5wcm9kdWN0b19pZCA9IHAuaWQKICAgICAgICAgICAgQU5EIHBtLmVtcHJlc2FfaWQgPSBwLmVtcHJlc2FfaWQKICAgICAgICAgICAgQU5EIHBtLmFjdGl2byA9IHRydWUKICAgICAgICApLAogICAgICAgICdbXSc6Ompzb24KICAgICAgKSBBUyBtdWx0aW1lZGlhCiAgICBGUk9NIHByb2R1Y3RvcyBwCiAgICBXSEVSRSBwLmVtcHJlc2FfaWQgPSAkMQogICAgICBBTkQgcC5hY3Rpdm8gPSB0cnVlCiAgICAgIEFORCBwLmlhX2FjdGl2byA9IHRydWUKICAgIE9SREVSIEJZIHAudXBkYXRlZF9hdCBERVNDLCBwLmlkIERFU0MKICAgIGAsCiAgICBbaWRdCiAgKTsKCiAgcmV0dXJuIHJlc3VsdC5yb3dzLm1hcChwcm9kdWN0b0Rlc2RlRmlsYSk7Cn0KCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvYnRlbmVyQ2F0YWxvZ29FbXByZXNhKGVtcHJlc2FJZCkgewogIGNvbnN0IGlkID0gTnVtYmVyKGVtcHJlc2FJZCk7CgogIHRyeSB7CiAgICBjb25zdCBkaW5hbWljb3MgPSBpZCA/IGF3YWl0IG9idGVuZXJQcm9kdWN0b3NEQihpZCkgOiBbXTsKCiAgICAvLyBDb21wYXRpYmlsaWRhZCB0ZW1wb3JhbDogbG9zIHByb2R1Y3RvcyBhbnRpZ3VvcyBkZSBLYWZlcyBzaWd1ZW4KICAgIC8vIGRpc3BvbmlibGVzIHNvbG8gcGFyYSBsYSBlbXByZXNhIGxlZ2FjeSBtaWVudHJhcyBzZSBtaWdyYW4gYWwgcGFuZWwuCiAgICBpZiAoaWQgPT09IExFR0FDWV9FTVBSRVNBX0lEIHx8ICFpZCkgewogICAgICBjb25zdCBzbHVncyA9IG5ldyBTZXQoZGluYW1pY29zLm1hcCgocCkgPT4gcC5zbHVnKSk7CiAgICAgIHJldHVybiBbCiAgICAgICAgLi4uZGluYW1pY29zLAogICAgICAgIC4uLlBST0RVQ1RPUy5maWx0ZXIoKHApID0+ICFzbHVncy5oYXMocC5zbHVnKSksCiAgICAgIF07CiAgICB9CgogICAgcmV0dXJuIGRpbmFtaWNvczsKICB9IGNhdGNoIChlcnJvcikgewogICAgY29uc29sZS5lcnJvcigKICAgICAgIkVSUk9SIENBUkdBTkRPIENBVEFMT0dPIElBOiIsCiAgICAgIGVycm9yPy5tZXNzYWdlIHx8IGVycm9yCiAgICApOwoKICAgIGlmIChpZCA9PT0gTEVHQUNZX0VNUFJFU0FfSUQgfHwgIWlkKSB7CiAgICAgIHJldHVybiBQUk9EVUNUT1M7CiAgICB9CgogICAgcmV0dXJuIFtdOwogIH0KfQoKZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJ1c2NhclByb2R1Y3RvUG9yU2x1ZyhzbHVnLCBlbXByZXNhSWQpIHsKICBjb25zdCB2YWxvciA9IFN0cmluZyhzbHVnIHx8ICIiKS50cmltKCk7CiAgaWYgKCF2YWxvcikgcmV0dXJuIG51bGw7CgogIGNvbnN0IGNhdGFsb2dvID0gYXdhaXQgb2J0ZW5lckNhdGFsb2dvRW1wcmVzYShlbXByZXNhSWQpOwogIHJldHVybiBjYXRhbG9nby5maW5kKChwKSA9PiBwLnNsdWcgPT09IHZhbG9yKSB8fCBudWxsOwp9CgpleHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVzY2FyUHJvZHVjdG8odGV4dG8sIGVtcHJlc2FJZCkgewogIGNvbnN0IHQgPSBub3JtYWxpemFyKHRleHRvKTsKICBpZiAoIXQpIHJldHVybiBudWxsOwoKICBjb25zdCBjYXRhbG9nbyA9IGF3YWl0IG9idGVuZXJDYXRhbG9nb0VtcHJlc2EoZW1wcmVzYUlkKTsKCiAgY29uc3QgY29pbmNpZGVuY2lhcyA9IGNhdGFsb2dvCiAgICAubWFwKChwcm9kdWN0bykgPT4gewogICAgICBjb25zdCBhbGlhc2VzID0gQXJyYXkuaXNBcnJheShwcm9kdWN0by5hbGlhc2VzKQogICAgICAgID8gcHJvZHVjdG8uYWxpYXNlcwogICAgICAgIDogY29uc3RydWlyQWxpYXNlcyhwcm9kdWN0byk7CgogICAgICBjb25zdCBtZWpvciA9IGFsaWFzZXMKICAgICAgICAuZmlsdGVyKChhbGlhcykgPT4gYWxpYXMgJiYgdC5pbmNsdWRlcyhub3JtYWxpemFyKGFsaWFzKSkpCiAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpWzBdOwoKICAgICAgcmV0dXJuIG1lam9yCiAgICAgICAgPyB7IHByb2R1Y3RvLCBsYXJnbzogbm9ybWFsaXphcihtZWpvcikubGVuZ3RoIH0KICAgICAgICA6IG51bGw7CiAgICB9KQogICAgLmZpbHRlcihCb29sZWFuKQogICAgLnNvcnQoKGEsIGIpID0+IGIubGFyZ28gLSBhLmxhcmdvKTsKCiAgcmV0dXJuIGNvaW5jaWRlbmNpYXNbMF0/LnByb2R1Y3RvIHx8IG51bGw7Cn0KCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvYnRlbmVyTXVsdGltZWRpYVByb2R1Y3RvKAogIHNsdWcsCiAgdGlwbywKICBlbXByZXNhSWQKKSB7CiAgY29uc3QgcHJvZHVjdG8gPSBhd2FpdCBidXNjYXJQcm9kdWN0b1BvclNsdWcoc2x1ZywgZW1wcmVzYUlkKTsKICBpZiAoIXByb2R1Y3RvPy5tdWx0aW1lZGlhKSByZXR1cm4gW107CgogIGNvbnN0IG1hcGEgPSB7CiAgICBmb3RvOiAiZm90b3MiLAogICAgdmlkZW86ICJ2aWRlb3MiLAogICAgYXVkaW86ICJhdWRpb3MiLAogICAgZ2lmOiAiZ2lmcyIsCiAgfTsKCiAgY29uc3QgY2xhdmUgPSBtYXBhW3RpcG9dOwoKICByZXR1cm4gY2xhdmUgJiYgQXJyYXkuaXNBcnJheShwcm9kdWN0by5tdWx0aW1lZGlhW2NsYXZlXSkKICAgID8gcHJvZHVjdG8ubXVsdGltZWRpYVtjbGF2ZV0KICAgIDogW107Cn0K", "base64").toString("utf8"),
  "utf8"
);
console.log("ACTUALIZADO: bot/catalogo.mjs");

// IA
const iaFile = "app/whatsapp-qr-server/bot/ia.mjs";
let ia = fs.readFileSync(iaFile, "utf8");

ia = assertReplace(
  ia,
  'import { PRODUCTOS } from "./catalogo.mjs";',
  'import { obtenerCatalogoEmpresa } from "./catalogo.mjs";',
  "import catalogo en ia.mjs"
);

ia = assertReplace(
  ia,
  "function prepararCatalogo() {\n  return PRODUCTOS.map((p) => ({",
  "function prepararCatalogo(productos = []) {\n  return productos.map((p) => ({",
  "prepararCatalogo"
);

ia = assertReplace(
  ia,
  "    beneficios: p.beneficios,\n    multimediaDisponible:",
  `    beneficios: p.beneficios,
    caracteristicas: p.caracteristicas || [],
    usos: p.usos || [],
    incluye: p.incluye || [],
    garantia: p.garantia || null,
    stock: p.stock ?? null,
    promociones: p.promociones || [],
    multimediaDisponible:`,
  "campos dinamicos catalogo"
);

ia = assertReplace(
  ia,
  `  const historial =
    typeof input === "object"
      ? input?.historial || []
      : [];

  const venta = memoria?.venta || null;`,
  `  const historial =
    typeof input === "object"
      ? input?.historial || []
      : [];

  const empresaId =
    typeof input === "object"
      ? Number(input?.empresaId || input?.empresa_id || 0) || null
      : null;

  const catalogoEmpresa = await obtenerCatalogoEmpresa(empresaId);

  const venta = memoria?.venta || null;`,
  "empresaId/catalogoEmpresa en consultarIA"
);

ia = assertReplace(
  ia,
  "${JSON.stringify(prepararCatalogo(), null, 2)}",
  "${JSON.stringify(prepararCatalogo(catalogoEmpresa), null, 2)}",
  "catalogo real dinamico"
);

fs.writeFileSync(iaFile, ia, "utf8");
console.log("ACTUALIZADO: bot/ia.mjs");

// Cerebro
const cerebroFile = "app/whatsapp-qr-server/bot/cerebro.mjs";
let cerebro = fs.readFileSync(cerebroFile, "utf8");

cerebro = assertReplace(
  cerebro,
  "function respuestaRespaldo(texto, memoria = {}) {",
  "async function respuestaRespaldo(texto, memoria = {}, empresaId = null) {",
  "respuestaRespaldo async"
);

cerebro = assertReplace(
  cerebro,
  `  const producto =
    buscarProducto(texto) ||
    buscarProductoPorSlug(memoria.producto);`,
  `  const producto =
    (await buscarProducto(texto, empresaId)) ||
    (await buscarProductoPorSlug(memoria.producto, empresaId));`,
  "busqueda dinamica respaldo"
);

cerebro = assertReplace(
  cerebro,
  `  memoria = {},
  historial = [],
}) {`,
  `  memoria = {},
  historial = [],
  empresaId = null,
}) {`,
  "empresaId firma decidirRespuestaBot"
);

cerebro = assertReplace(
  cerebro,
  `    const analisis = await consultarIA({
      mensaje: texto,
      memoria,
      historial,
    });`,
  `    const analisis = await consultarIA({
      mensaje: texto,
      memoria,
      historial,
      empresaId,
    });`,
  "empresaId consultarIA"
);

cerebro = cerebro.replaceAll(
  "return respuestaRespaldo(texto, memoria);",
  "return await respuestaRespaldo(texto, memoria, empresaId);"
);

fs.writeFileSync(cerebroFile, cerebro, "utf8");
console.log("ACTUALIZADO: bot/cerebro.mjs");

// Server
const serverFile = "app/whatsapp-qr-server/server.mjs";
let server = fs.readFileSync(serverFile, "utf8");

server = assertReplace(
  server,
  `    memoria,
    historial,
  });`,
  `    memoria,
    historial,
    empresaId: empresaQrId,
  });`,
  "empresaId decidirRespuestaBot server"
);

server = assertReplace(
  server,
  `    const fotos = obtenerMultimediaProducto(respuestaBot.producto, "foto");
    const videos = obtenerMultimediaProducto(respuestaBot.producto, "video");`,
  `    const fotos = await obtenerMultimediaProducto(
      respuestaBot.producto,
      "foto",
      empresaQrId
    );
    const videos = await obtenerMultimediaProducto(
      respuestaBot.producto,
      "video",
      empresaQrId
    );`,
  "multimedia presentacion async"
);

server = assertReplace(
  server,
  `        ? obtenerMultimediaProducto(
            respuestaBot.producto,
            multimediaSolicitada
          )
        : [];`,
  `        ? await obtenerMultimediaProducto(
            respuestaBot.producto,
            multimediaSolicitada,
            empresaQrId
          )
        : [];`,
  "multimedia normal async"
);

fs.writeFileSync(serverFile, server, "utf8");
console.log("ACTUALIZADO: server.mjs");

console.log("CATALOGO IA V3 CONECTADO AL VENDEDOR MAESTRO");
console.log("DB por empresa_id + promociones + multimedia");
console.log("Legacy Kafes permanece como respaldo temporal solo para empresa 1");
