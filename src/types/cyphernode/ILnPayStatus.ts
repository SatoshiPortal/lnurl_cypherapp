export default interface ILnPayStatus {
  pay: { attempts: { success?: unknown; failure?: unknown }[] }[];
}
