import CopyButton from "@/components/CopyButton";

interface Props {
   label: string;
}
const CopyableItem = ({ label }: Props) => {
   return (
      <div className="flex flex-wrap items-center gap-4">
         <p className="text-paragraph-1">{label}</p>
         <CopyButton text={label} />
      </div>
   );
};

export default CopyableItem;
