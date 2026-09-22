const fs = require("fs");
const path = require("path");

function writeB64(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data, "base64").toString("utf8"), "utf8");
  console.log("CREADO:", file);
}

writeB64("app/api/productos/[id]/multimedia/route.ts", "aW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAibmV4dC9zZXJ2ZXIiOwppbXBvcnQgeyBQb29sIH0gZnJvbSAicGciOwppbXBvcnQgeyBta2Rpciwgd3JpdGVGaWxlIH0gZnJvbSAibm9kZTpmcy9wcm9taXNlcyI7CmltcG9ydCBwYXRoIGZyb20gIm5vZGU6cGF0aCI7CmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICJub2RlOmNyeXB0byI7CgpleHBvcnQgY29uc3QgcnVudGltZSA9ICJub2RlanMiOwoKY29uc3QgcG9vbCA9IG5ldyBQb29sKHsKICBjb25uZWN0aW9uU3RyaW5nOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwsCn0pOwoKY29uc3QgU1RPUkFHRV9ESVIgPQogIHByb2Nlc3MuZW52LkNBVEFMT0dPX1NUT1JBR0VfRElSIHx8CiAgcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICJzdG9yYWdlIiwgImNhdGFsb2dvIik7Cgpjb25zdCBNQVhfRklMRV9TSVpFID0gMzAgKiAxMDI0ICogMTAyNDsKCmZ1bmN0aW9uIGRldGVjdGFyVGlwbyhtaW1lOiBzdHJpbmcpIHsKICBjb25zdCB0aXBvID0gU3RyaW5nKG1pbWUgfHwgIiIpLnRvTG93ZXJDYXNlKCk7CgogIGlmICh0aXBvID09PSAiaW1hZ2UvZ2lmIikgcmV0dXJuICJnaWYiOwogIGlmICh0aXBvLnN0YXJ0c1dpdGgoImltYWdlLyIpKSByZXR1cm4gImZvdG8iOwogIGlmICh0aXBvLnN0YXJ0c1dpdGgoInZpZGVvLyIpKSByZXR1cm4gInZpZGVvIjsKICBpZiAodGlwby5zdGFydHNXaXRoKCJhdWRpby8iKSkgcmV0dXJuICJhdWRpbyI7CgogIHJldHVybiBudWxsOwp9CgpmdW5jdGlvbiBleHRlbnNpb25TZWd1cmEobm9tYnJlOiBzdHJpbmcsIG1pbWU6IHN0cmluZykgewogIGNvbnN0IGV4dE5vbWJyZSA9IHBhdGguZXh0bmFtZShub21icmUgfHwgIiIpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXowLTkuXS9nLCAiIik7CgogIGlmIChleHROb21icmUgJiYgZXh0Tm9tYnJlLmxlbmd0aCA8PSA4KSB7CiAgICByZXR1cm4gZXh0Tm9tYnJlOwogIH0KCiAgY29uc3QgbWFwYTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsKICAgICJpbWFnZS9qcGVnIjogIi5qcGciLAogICAgImltYWdlL3BuZyI6ICIucG5nIiwKICAgICJpbWFnZS93ZWJwIjogIi53ZWJwIiwKICAgICJpbWFnZS9naWYiOiAiLmdpZiIsCiAgICAidmlkZW8vbXA0IjogIi5tcDQiLAogICAgInZpZGVvL3dlYm0iOiAiLndlYm0iLAogICAgImF1ZGlvL21wZWciOiAiLm1wMyIsCiAgICAiYXVkaW8vb2dnIjogIi5vZ2ciLAogICAgImF1ZGlvL21wNCI6ICIubTRhIiwKICB9OwoKICByZXR1cm4gbWFwYVttaW1lXSB8fCAiLmJpbiI7Cn0KCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKAogIHJlcXVlc3Q6IFJlcXVlc3QsCiAgY29udGV4dDogeyBwYXJhbXM6IFByb21pc2U8eyBpZDogc3RyaW5nIH0+IH0KKSB7CiAgdHJ5IHsKICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IGNvbnRleHQucGFyYW1zOwogICAgY29uc3QgcHJvZHVjdG9JZCA9IE51bWJlcihpZCk7CiAgICBjb25zdCBmb3JtRGF0YSA9IGF3YWl0IHJlcXVlc3QuZm9ybURhdGEoKTsKICAgIGNvbnN0IGVtcHJlc2FJZCA9IE51bWJlcihmb3JtRGF0YS5nZXQoImVtcHJlc2FfaWQiKSk7CiAgICBjb25zdCBhcmNoaXZvID0gZm9ybURhdGEuZ2V0KCJhcmNoaXZvIik7CgogICAgaWYgKCFwcm9kdWN0b0lkIHx8ICFlbXByZXNhSWQgfHwgIShhcmNoaXZvIGluc3RhbmNlb2YgRmlsZSkpIHsKICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKAogICAgICAgIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAiRmFsdGFuIGRhdG9zIHBhcmEgc3ViaXIgZWwgYXJjaGl2byIgfSwKICAgICAgICB7IHN0YXR1czogNDAwIH0KICAgICAgKTsKICAgIH0KCiAgICBpZiAoYXJjaGl2by5zaXplIDw9IDApIHsKICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKAogICAgICAgIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAiRWwgYXJjaGl2byBlc3TDoSB2YWPDrW8iIH0sCiAgICAgICAgeyBzdGF0dXM6IDQwMCB9CiAgICAgICk7CiAgICB9CgogICAgaWYgKGFyY2hpdm8uc2l6ZSA+IE1BWF9GSUxFX1NJWkUpIHsKICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKAogICAgICAgIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAiRWwgYXJjaGl2byBzdXBlcmEgZWwgbMOtbWl0ZSBkZSAzMCBNQiIgfSwKICAgICAgICB7IHN0YXR1czogNDAwIH0KICAgICAgKTsKICAgIH0KCiAgICBjb25zdCB0aXBvID0gZGV0ZWN0YXJUaXBvKGFyY2hpdm8udHlwZSk7CgogICAgaWYgKCF0aXBvKSB7CiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbigKICAgICAgICB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogIlNvbG8gc2UgcGVybWl0ZW4gZm90b3MsIEdJRiwgdmlkZW9zIG8gYXVkaW9zIiB9LAogICAgICAgIHsgc3RhdHVzOiA0MDAgfQogICAgICApOwogICAgfQoKICAgIGNvbnN0IHByb2R1Y3RvID0gYXdhaXQgcG9vbC5xdWVyeSgKICAgICAgYAogICAgICBTRUxFQ1QgaWQKICAgICAgRlJPTSBwcm9kdWN0b3MKICAgICAgV0hFUkUgaWQgPSAkMQogICAgICAgIEFORCBlbXByZXNhX2lkID0gJDIKICAgICAgTElNSVQgMQogICAgICBgLAogICAgICBbcHJvZHVjdG9JZCwgZW1wcmVzYUlkXQogICAgKTsKCiAgICBpZiAocHJvZHVjdG8ucm93Q291bnQgPT09IDApIHsKICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKAogICAgICAgIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAiUHJvZHVjdG8gbm8gZW5jb250cmFkbyIgfSwKICAgICAgICB7IHN0YXR1czogNDA0IH0KICAgICAgKTsKICAgIH0KCiAgICBjb25zdCBleHRlbnNpb24gPSBleHRlbnNpb25TZWd1cmEoYXJjaGl2by5uYW1lLCBhcmNoaXZvLnR5cGUpOwogICAgY29uc3Qgbm9tYnJlQXJjaGl2byA9IGAke3JhbmRvbVVVSUQoKX0ke2V4dGVuc2lvbn1gOwogICAgY29uc3QgY2FycGV0YVJlbGF0aXZhID0gcGF0aC5qb2luKAogICAgICBgZW1wcmVzYS0ke2VtcHJlc2FJZH1gLAogICAgICBgcHJvZHVjdG8tJHtwcm9kdWN0b0lkfWAKICAgICk7CiAgICBjb25zdCBjYXJwZXRhQWJzb2x1dGEgPSBwYXRoLmpvaW4oU1RPUkFHRV9ESVIsIGNhcnBldGFSZWxhdGl2YSk7CgogICAgYXdhaXQgbWtkaXIoY2FycGV0YUFic29sdXRhLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTsKCiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShhd2FpdCBhcmNoaXZvLmFycmF5QnVmZmVyKCkpOwogICAgY29uc3QgcnV0YUFic29sdXRhID0gcGF0aC5qb2luKGNhcnBldGFBYnNvbHV0YSwgbm9tYnJlQXJjaGl2byk7CiAgICBhd2FpdCB3cml0ZUZpbGUocnV0YUFic29sdXRhLCBidWZmZXIpOwoKICAgIGNvbnN0IHJ1dGFSZWxhdGl2YSA9IHBhdGgKICAgICAgLmpvaW4oY2FycGV0YVJlbGF0aXZhLCBub21icmVBcmNoaXZvKQogICAgICAucmVwbGFjZSgvXFwvZywgIi8iKTsKCiAgICBjb25zdCBvcmRlblJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoCiAgICAgIGAKICAgICAgU0VMRUNUIENPQUxFU0NFKE1BWChvcmRlbiksIC0xKSArIDEgQVMgc2lndWllbnRlCiAgICAgIEZST00gcHJvZHVjdG9fbXVsdGltZWRpYQogICAgICBXSEVSRSBwcm9kdWN0b19pZCA9ICQxCiAgICAgICAgQU5EIGVtcHJlc2FfaWQgPSAkMgogICAgICBgLAogICAgICBbcHJvZHVjdG9JZCwgZW1wcmVzYUlkXQogICAgKTsKCiAgICBjb25zdCBvcmRlbiA9IE51bWJlcihvcmRlblJlc3VsdC5yb3dzWzBdPy5zaWd1aWVudGUgfHwgMCk7CgogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeSgKICAgICAgYAogICAgICBJTlNFUlQgSU5UTyBwcm9kdWN0b19tdWx0aW1lZGlhICgKICAgICAgICBwcm9kdWN0b19pZCwKICAgICAgICBlbXByZXNhX2lkLAogICAgICAgIHRpcG8sCiAgICAgICAgdXJsLAogICAgICAgIG9yZGVuLAogICAgICAgIGFjdGl2bwogICAgICApCiAgICAgIFZBTFVFUyAoJDEsICQyLCAkMywgJDQsICQ1LCB0cnVlKQogICAgICBSRVRVUk5JTkcgaWQsIHByb2R1Y3RvX2lkLCBlbXByZXNhX2lkLCB0aXBvLCB1cmwsIG9yZGVuLCBhY3Rpdm8sIGNyZWF0ZWRfYXQKICAgICAgYCwKICAgICAgW3Byb2R1Y3RvSWQsIGVtcHJlc2FJZCwgdGlwbywgcnV0YVJlbGF0aXZhLCBvcmRlbl0KICAgICk7CgogICAgY29uc3QgbWVkaWEgPSByZXN1bHQucm93c1swXTsKCiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oewogICAgICBzdWNjZXNzOiB0cnVlLAogICAgICBtZWRpYTogewogICAgICAgIC4uLm1lZGlhLAogICAgICAgIHByZXZpZXdfdXJsOiBgL2FwaS9wcm9kdWN0b3MvbWVkaWEvJHttZWRpYS5pZH0/ZW1wcmVzYV9pZD0ke2VtcHJlc2FJZH1gLAogICAgICB9LAogICAgfSk7CiAgfSBjYXRjaCAoZXJyb3IpIHsKICAgIGNvbnNvbGUuZXJyb3IoIkVSUk9SIFNVQklFTkRPIE1VTFRJTUVESUEgUFJPRFVDVE86IiwgZXJyb3IpOwoKICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbigKICAgICAgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICJObyBzZSBwdWRvIHN1YmlyIGVsIGFyY2hpdm8iIH0sCiAgICAgIHsgc3RhdHVzOiA1MDAgfQogICAgKTsKICB9Cn0K");
writeB64("app/api/productos/media/[id]/route.ts", "aW1wb3J0IHsgUG9vbCB9IGZyb20gInBnIjsKaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICJub2RlOmZzL3Byb21pc2VzIjsKaW1wb3J0IHBhdGggZnJvbSAibm9kZTpwYXRoIjsKCmV4cG9ydCBjb25zdCBydW50aW1lID0gIm5vZGVqcyI7Cgpjb25zdCBwb29sID0gbmV3IFBvb2woewogIGNvbm5lY3Rpb25TdHJpbmc6IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCwKfSk7Cgpjb25zdCBTVE9SQUdFX0RJUiA9CiAgcHJvY2Vzcy5lbnYuQ0FUQUxPR09fU1RPUkFHRV9ESVIgfHwKICBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgInN0b3JhZ2UiLCAiY2F0YWxvZ28iKTsKCmZ1bmN0aW9uIG1pbWVEZXNkZVJ1dGEocnV0YTogc3RyaW5nLCB0aXBvOiBzdHJpbmcpIHsKICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUocnV0YSB8fCAiIikudG9Mb3dlckNhc2UoKTsKCiAgY29uc3QgbWFwYTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsKICAgICIuanBnIjogImltYWdlL2pwZWciLAogICAgIi5qcGVnIjogImltYWdlL2pwZWciLAogICAgIi5wbmciOiAiaW1hZ2UvcG5nIiwKICAgICIud2VicCI6ICJpbWFnZS93ZWJwIiwKICAgICIuZ2lmIjogImltYWdlL2dpZiIsCiAgICAiLm1wNCI6ICJ2aWRlby9tcDQiLAogICAgIi53ZWJtIjogInZpZGVvL3dlYm0iLAogICAgIi5tcDMiOiAiYXVkaW8vbXBlZyIsCiAgICAiLm9nZyI6ICJhdWRpby9vZ2ciLAogICAgIi5tNGEiOiAiYXVkaW8vbXA0IiwKICB9OwoKICBpZiAobWFwYVtleHRdKSByZXR1cm4gbWFwYVtleHRdOwogIGlmICh0aXBvID09PSAiZm90byIpIHJldHVybiAiaW1hZ2UvanBlZyI7CiAgaWYgKHRpcG8gPT09ICJnaWYiKSByZXR1cm4gImltYWdlL2dpZiI7CiAgaWYgKHRpcG8gPT09ICJ2aWRlbyIpIHJldHVybiAidmlkZW8vbXA0IjsKICBpZiAodGlwbyA9PT0gImF1ZGlvIikgcmV0dXJuICJhdWRpby9tcGVnIjsKCiAgcmV0dXJuICJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0iOwp9CgpleHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKAogIHJlcXVlc3Q6IFJlcXVlc3QsCiAgY29udGV4dDogeyBwYXJhbXM6IFByb21pc2U8eyBpZDogc3RyaW5nIH0+IH0KKSB7CiAgdHJ5IHsKICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IGNvbnRleHQucGFyYW1zOwogICAgY29uc3QgbWVkaWFJZCA9IE51bWJlcihpZCk7CiAgICBjb25zdCB7IHNlYXJjaFBhcmFtcyB9ID0gbmV3IFVSTChyZXF1ZXN0LnVybCk7CiAgICBjb25zdCBlbXByZXNhSWQgPSBOdW1iZXIoc2VhcmNoUGFyYW1zLmdldCgiZW1wcmVzYV9pZCIpKTsKCiAgICBpZiAoIW1lZGlhSWQgfHwgIWVtcHJlc2FJZCkgewogICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKCJEYXRvcyBpbnbDoWxpZG9zIiwgeyBzdGF0dXM6IDQwMCB9KTsKICAgIH0KCiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KAogICAgICBgCiAgICAgIFNFTEVDVCBpZCwgZW1wcmVzYV9pZCwgdGlwbywgdXJsCiAgICAgIEZST00gcHJvZHVjdG9fbXVsdGltZWRpYQogICAgICBXSEVSRSBpZCA9ICQxCiAgICAgICAgQU5EIGVtcHJlc2FfaWQgPSAkMgogICAgICAgIEFORCBhY3Rpdm8gPSB0cnVlCiAgICAgIExJTUlUIDEKICAgICAgYCwKICAgICAgW21lZGlhSWQsIGVtcHJlc2FJZF0KICAgICk7CgogICAgaWYgKHJlc3VsdC5yb3dDb3VudCA9PT0gMCkgewogICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKCJBcmNoaXZvIG5vIGVuY29udHJhZG8iLCB7IHN0YXR1czogNDA0IH0pOwogICAgfQoKICAgIGNvbnN0IG1lZGlhID0gcmVzdWx0LnJvd3NbMF07CiAgICBjb25zdCBydXRhUmVsYXRpdmEgPSBTdHJpbmcobWVkaWEudXJsIHx8ICIiKS5yZXBsYWNlKC9eWy9cXF0rLywgIiIpOwogICAgY29uc3QgcnV0YUFic29sdXRhID0gcGF0aC5yZXNvbHZlKFNUT1JBR0VfRElSLCBydXRhUmVsYXRpdmEpOwogICAgY29uc3QgcmFpekFic29sdXRhID0gcGF0aC5yZXNvbHZlKFNUT1JBR0VfRElSKTsKCiAgICBpZiAoCiAgICAgIHJ1dGFBYnNvbHV0YSAhPT0gcmFpekFic29sdXRhICYmCiAgICAgICFydXRhQWJzb2x1dGEuc3RhcnRzV2l0aChyYWl6QWJzb2x1dGEgKyBwYXRoLnNlcCkKICAgICkgewogICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKCJSdXRhIGludsOhbGlkYSIsIHsgc3RhdHVzOiA0MDAgfSk7CiAgICB9CgogICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZEZpbGUocnV0YUFic29sdXRhKTsKCiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIHsKICAgICAgc3RhdHVzOiAyMDAsCiAgICAgIGhlYWRlcnM6IHsKICAgICAgICAiQ29udGVudC1UeXBlIjogbWltZURlc2RlUnV0YShtZWRpYS51cmwsIG1lZGlhLnRpcG8pLAogICAgICAgICJDYWNoZS1Db250cm9sIjogInByaXZhdGUsIG1heC1hZ2U9MzYwMCIsCiAgICAgIH0sCiAgICB9KTsKICB9IGNhdGNoIChlcnJvcikgewogICAgY29uc29sZS5lcnJvcigiRVJST1IgTEVZRU5ETyBNVUxUSU1FRElBIFBST0RVQ1RPOiIsIGVycm9yKTsKICAgIHJldHVybiBuZXcgUmVzcG9uc2UoIkFyY2hpdm8gbm8gZGlzcG9uaWJsZSIsIHsgc3RhdHVzOiA0MDQgfSk7CiAgfQp9CgpleHBvcnQgYXN5bmMgZnVuY3Rpb24gREVMRVRFKAogIHJlcXVlc3Q6IFJlcXVlc3QsCiAgY29udGV4dDogeyBwYXJhbXM6IFByb21pc2U8eyBpZDogc3RyaW5nIH0+IH0KKSB7CiAgdHJ5IHsKICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IGNvbnRleHQucGFyYW1zOwogICAgY29uc3QgbWVkaWFJZCA9IE51bWJlcihpZCk7CiAgICBjb25zdCB7IHNlYXJjaFBhcmFtcyB9ID0gbmV3IFVSTChyZXF1ZXN0LnVybCk7CiAgICBjb25zdCBlbXByZXNhSWQgPSBOdW1iZXIoc2VhcmNoUGFyYW1zLmdldCgiZW1wcmVzYV9pZCIpKTsKCiAgICBpZiAoIW1lZGlhSWQgfHwgIWVtcHJlc2FJZCkgewogICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKAogICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAiRGF0b3MgaW52w6FsaWRvcyIgfSksCiAgICAgICAgewogICAgICAgICAgc3RhdHVzOiA0MDAsCiAgICAgICAgICBoZWFkZXJzOiB7ICJDb250ZW50LVR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIgfSwKICAgICAgICB9CiAgICAgICk7CiAgICB9CgogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeSgKICAgICAgYAogICAgICBERUxFVEUgRlJPTSBwcm9kdWN0b19tdWx0aW1lZGlhCiAgICAgIFdIRVJFIGlkID0gJDEKICAgICAgICBBTkQgZW1wcmVzYV9pZCA9ICQyCiAgICAgIFJFVFVSTklORyBpZAogICAgICBgLAogICAgICBbbWVkaWFJZCwgZW1wcmVzYUlkXQogICAgKTsKCiAgICBpZiAocmVzdWx0LnJvd0NvdW50ID09PSAwKSB7CiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoCiAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICJBcmNoaXZvIG5vIGVuY29udHJhZG8iIH0pLAogICAgICAgIHsKICAgICAgICAgIHN0YXR1czogNDA0LAogICAgICAgICAgaGVhZGVyczogeyAiQ29udGVudC1UeXBlIjogImFwcGxpY2F0aW9uL2pzb24iIH0sCiAgICAgICAgfQogICAgICApOwogICAgfQoKICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pLCB7CiAgICAgIHN0YXR1czogMjAwLAogICAgICBoZWFkZXJzOiB7ICJDb250ZW50LVR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIgfSwKICAgIH0pOwogIH0gY2F0Y2ggKGVycm9yKSB7CiAgICBjb25zb2xlLmVycm9yKCJFUlJPUiBFTElNSU5BTkRPIE1VTFRJTUVESUEgUFJPRFVDVE86IiwgZXJyb3IpOwoKICAgIHJldHVybiBuZXcgUmVzcG9uc2UoCiAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAiTm8gc2UgcHVkbyBlbGltaW5hciIgfSksCiAgICAgIHsKICAgICAgICBzdGF0dXM6IDUwMCwKICAgICAgICBoZWFkZXJzOiB7ICJDb250ZW50LVR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIgfSwKICAgICAgfQogICAgKTsKICB9Cn0K");

const apiFile = "app/api/productos/route.ts";
let api = fs.readFileSync(apiFile, "utf8");

if (!api.includes("AS multimedia")) {
  const anchor = `        ) AS promociones
      FROM productos p`;

  const replacement = `        ) AS promociones,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pm.id,
                'tipo', pm.tipo,
                'url', pm.url,
                'orden', pm.orden,
                'activo', pm.activo,
                'created_at', pm.created_at
              )
              ORDER BY pm.orden ASC, pm.id ASC
            )
            FROM producto_multimedia pm
            WHERE pm.producto_id = p.id
              AND pm.empresa_id = p.empresa_id
              AND pm.activo = true
          ),
          '[]'::json
        ) AS multimedia
      FROM productos p`;

  if (!api.includes(anchor)) {
    throw new Error("No encontré el punto para agregar multimedia en app/api/productos/route.ts");
  }

  api = api.replace(anchor, replacement);
  fs.writeFileSync(apiFile, api, "utf8");
  console.log("ACTUALIZADO:", apiFile);
}

const pageFile = "app/catalogo/page.tsx";
let page = fs.readFileSync(pageFile, "utf8");

if (!page.includes("type Multimedia =")) {
  page = page.replace(
    `type Promocion = {`,
    `type Multimedia = {
  id: number;
  tipo: "foto" | "video" | "audio" | "gif";
  url: string;
  orden: number;
  activo: boolean;
  created_at?: string;
};

type Promocion = {`
  );
}

if (!page.includes("multimedia: Multimedia[];")) {
  page = page.replace(
    `  promociones: Promocion[];
};`,
    `  promociones: Promocion[];
  multimedia: Multimedia[];
};`
  );
}

if (!page.includes("const [subiendoMedia")) {
  page = page.replace(
    `  const [mensajeEstado, setMensajeEstado] = useState("");`,
    `  const [mensajeEstado, setMensajeEstado] = useState("");
  const [subiendoMedia, setSubiendoMedia] = useState(false);`
  );
}

if (!page.includes("const subirMultimedia = async")) {
  const anchor = `  const eliminarProducto = async (producto: Producto) => {`;

  const methods = `  const subirMultimedia = async (archivos: FileList | null) => {
    if (!empresaId || !form.id || !archivos || archivos.length === 0) return;

    setSubiendoMedia(true);
    setMensajeEstado("");

    try {
      for (const archivo of Array.from(archivos)) {
        const data = new FormData();
        data.append("empresa_id", String(empresaId));
        data.append("archivo", archivo);

        const res = await fetch(\`/api/productos/\${form.id}/multimedia\`, {
          method: "POST",
          body: data,
        });

        const respuesta = await res.json();

        if (!respuesta.success) {
          throw new Error(respuesta.error || "No se pudo subir un archivo");
        }
      }

      setMensajeEstado("Multimedia subida correctamente ✅");
      await cargarProductos(empresaId);
    } catch (error: any) {
      setMensajeEstado(error?.message || "No se pudo subir la multimedia");
    } finally {
      setSubiendoMedia(false);
    }
  };

  const eliminarMultimedia = async (mediaId: number) => {
    if (!empresaId) return;

    const res = await fetch(
      \`/api/productos/media/\${mediaId}?empresa_id=\${empresaId}\`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (!data.success) {
      setMensajeEstado(data.error || "No se pudo eliminar el archivo");
      return;
    }

    setMensajeEstado("Archivo eliminado del catálogo");
    await cargarProductos(empresaId);
  };

`;

  if (!page.includes(anchor)) {
    throw new Error("No encontré el punto para agregar funciones multimedia");
  }

  page = page.replace(anchor, methods + anchor);
}

if (!page.includes("📷 Fotos y videos")) {
  const anchor = `              <div className="grid grid-cols-2 gap-3 mb-5">`;

  const multimediaUi = `              <div className="border rounded-2xl p-4 mb-4 bg-slate-50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-black">📷 Fotos y videos</p>
                    <p className="text-xs text-gray-500">
                      La IA podrá usar estos archivos al presentar el producto.
                    </p>
                  </div>
                </div>

                {!form.id ? (
                  <p className="text-sm text-gray-500">
                    Primero guarda el producto. Luego podrás subir su multimedia.
                  </p>
                ) : (
                  <>
                    <label className="block cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-white hover:bg-slate-50">
                      <input
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        className="hidden"
                        disabled={subiendoMedia}
                        onChange={(e) => {
                          subirMultimedia(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                      <span className="font-black">
                        {subiendoMedia ? "Subiendo..." : "+ Subir fotos o videos"}
                      </span>
                      <span className="block text-xs text-gray-500 mt-1">
                        Máximo 30 MB por archivo
                      </span>
                    </label>

                    {(() => {
                      const productoEditado = productos.find((p) => p.id === form.id);
                      const multimedia = productoEditado?.multimedia || [];

                      if (multimedia.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 mt-3">
                            Este producto todavía no tiene multimedia.
                          </p>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          {multimedia.map((media) => {
                            const src = \`/api/productos/media/\${media.id}?empresa_id=\${empresaId}\`;

                            return (
                              <div key={media.id} className="border rounded-xl overflow-hidden bg-white">
                                <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                                  {media.tipo === "foto" || media.tipo === "gif" ? (
                                    <img
                                      src={src}
                                      alt="Multimedia del producto"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : media.tipo === "video" ? (
                                    <video
                                      src={src}
                                      controls
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="p-3 text-center text-sm font-bold">
                                      🎵 Audio
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => eliminarMultimedia(media.id)}
                                  className="w-full py-2 text-xs font-black text-red-600"
                                >
                                  Eliminar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

`;

  if (!page.includes(anchor)) {
    throw new Error("No encontré el punto para agregar UI multimedia");
  }

  page = page.replace(anchor, multimediaUi + anchor);
}

const oldCreate = `      setMensajeEstado(editando ? "Producto actualizado correctamente ✅" : "Producto creado correctamente ✅");
      setForm({ ...FORM_VACIO, promociones: [] });
      await cargarProductos(empresaId);`;

const newCreate = `      if (editando) {
        setMensajeEstado("Producto actualizado correctamente ✅");
      } else {
        setMensajeEstado("Producto creado correctamente ✅ Ya puedes subir fotos y videos.");
        setForm((actual) => ({
          ...actual,
          id: Number(data.producto?.id || 0) || null,
        }));
      }

      await cargarProductos(empresaId);`;

if (page.includes(oldCreate)) {
  page = page.replace(oldCreate, newCreate);
}

fs.writeFileSync(pageFile, page, "utf8");
console.log("ACTUALIZADO:", pageFile);

const gitignore = ".gitignore";
let gi = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf8") : "";

if (!gi.split(/\r?\n/).includes("storage/")) {
  if (gi && !gi.endsWith("\n")) gi += "\n";
  gi += "storage/\n";
  fs.writeFileSync(gitignore, gi, "utf8");
  console.log("ACTUALIZADO: .gitignore");
}

console.log("CATALOGO IA V2 MULTIMEDIA: OK");
console.log("Storage local: ./storage/catalogo");
console.log("Storage producción: /app/storage/catalogo");
