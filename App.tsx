import { useEffect,useMemo,useState } from "react";
import { ActivityIndicator,FlatList,Image,Modal,Pressable,SafeAreaView,StyleSheet,Text,TextInput,View } from "react-native";
import { Video,ResizeMode } from "expo-av";

type Movie={identifier:string;title:string;year?:string;poster?:string;description?:string};
type Subtitle={name:string,url:string};

const SEARCH="https://archive.org/advancedsearch.php?q=mediatype%3Amovies%20AND%20(collection%3Afeature_films%20OR%20collection%3Amovies)&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=date&rows=60&page=1&output=json";

async function searchArchive():Promise<Movie[]>{
 const r=await fetch(SEARCH); if(!r.ok) throw Error("Source unavailable");
 const j=await r.json();
 return (j.response?.docs??[]).map((m:any)=>({identifier:m.identifier,title:m.title||m.identifier,year:m.date?String(m.date).slice(0,4):undefined,poster:`https://archive.org/services/img/${encodeURIComponent(m.identifier)}`}));
}
async function metadata(id:string){const r=await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`);if(!r.ok)throw Error("Metadata unavailable");return r.json();}
function isVideo(name:string){return /\.(mp4|webm|m4v)$/i.test(name)&&!name.toLowerCase().includes("sample")&&!name.toLowerCase().includes("thumb")}
function isSubtitle(name:string){return /\.(srt|vtt|ass|ssa)$/i.test(name)}
async function sourceFiles(id:string):Promise<{video?:string;subtitles:Subtitle[]}>{
 const data=await metadata(id); const files=Array.isArray(data.files)?data.files:[];
 const v=files.find((f:any)=>isVideo(String(f.name||"")));
 const subtitles=files.filter((f:any)=>isSubtitle(String(f.name||""))).map((f:any)=>({name:String(f.name),url:`https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(String(f.name))}`}));
 return {video:v?`https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(String(v.name))}`:undefined,subtitles};
}

export default function Home(){
 const [movies,setMovies]=useState<Movie[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[selected,setSelected]=useState<Movie|null>(null),[videoUrl,setVideoUrl]=useState<string>(),[subs,setSubs]=useState<Subtitle[]>([]),[subtitle,setSubtitle]=useState<Subtitle|null>(null),[error,setError]=useState("");
 const load=async()=>{try{setError("");setMovies(await searchArchive())}catch{setError("Could not refresh the movie source. Check your connection and try again.")}finally{setLoading(false);setRefreshing(false)}};
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?movies.filter(m=>m.title.toLowerCase().includes(q)):movies},[movies,query]);
 const openMovie=async(m:Movie)=>{setSelected(m);setVideoUrl(undefined);setSubs([]);setSubtitle(null);try{const f=await sourceFiles(m.identifier);setVideoUrl(f.video);setSubs(f.subtitles)}catch{}};
 return <SafeAreaView style={s.safe}>
  <View style={s.header}><Text style={s.logo}>Malik<Text style={s.white}>Flix</Text></Text><Pressable onPress={()=>{setRefreshing(true);load()}} style={s.icon}><Text style={s.refreshGlyph}>↻</Text></Pressable></View>
  <View style={s.search}><Text style={s.searchGlyph}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search movies..." placeholderTextColor="#777" style={s.input}/></View>
  <View style={s.hero}><Text style={s.kicker}>MALIKFLIX</Text><Text style={s.heroTitle}>Movies worth watching.</Text><Text style={s.heroText}>Free-to-watch titles from connected legal sources. Refresh to discover new additions.</Text></View>
  {error?<Text style={s.error}>{error}</Text>:null}
  {loading?<ActivityIndicator size="large" color="#e50914" style={{marginTop:40}}/>:<FlatList data={filtered} keyExtractor={m=>m.identifier} numColumns={2} contentContainerStyle={s.grid} columnWrapperStyle={{gap:14}} refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load()}} ListHeaderComponent={<Text style={s.section}>Free movies</Text>} renderItem={({item})=><Pressable style={s.card} onPress={()=>openMovie(item)}><Image source={{uri:item.poster}} style={s.poster}/><Text style={s.title} numberOfLines={2}>{item.title}</Text><Text style={s.meta}>{item.year||"—"} · Free</Text></Pressable>} ListEmptyComponent={<Text style={s.empty}>No movies found.</Text>}/>}
  <Modal visible={!!selected} animationType="slide" onRequestClose={()=>setSelected(null)}>
   <SafeAreaView style={s.modal}><View style={s.modalHeader}><Text style={s.modalTitle} numberOfLines={1}>{selected?.title}</Text><Pressable onPress={()=>setSelected(null)}><Text style={s.closeGlyph}>×</Text></Pressable></View>
   {videoUrl?<Video source={{uri:videoUrl}} style={s.video} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay/>:<View style={s.noVideo}><Text style={s.filmGlyph}>▣</Text><Text style={s.noText}>No compatible video file was found for this source item.</Text></View>}
   <View style={s.details}><Text style={s.detailMeta}>{selected?.year||"Year unavailable"} · Internet Archive</Text>
    <Text style={s.subHeading}>Subtitles</Text>
    {subs.length?<View style={s.subs}>{subs.map((x,i)=><Pressable key={x.url} style={[s.subBtn,subtitle?.url===x.url&&s.subActive]} onPress={()=>setSubtitle(x)}><Text style={s.textGlyph}>CC</Text><Text style={s.subText}>{x.name.replace(/\.[^.]+$/,"")||`Track ${i+1}`}</Text></Pressable>)}<Pressable style={[s.subBtn,!subtitle&&s.subActive]} onPress={()=>setSubtitle(null)}><Text style={s.subText}>Off</Text></Pressable></View>:<Text style={s.subStatus}>No subtitle file was supplied by this source item.</Text>}
    <Text style={s.detailText}>Subtitles are used only when the connected legal source provides a subtitle track.</Text>
   </View>
  </SafeAreaView>
  </Modal>
 </SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#080808"},header:{height:64,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#202020"},logo:{fontSize:25,fontWeight:"900",color:"#e50914"},white:{color:"#fff"},icon:{padding:8},refreshGlyph:{color:"#fff",fontSize:25,lineHeight:28},searchGlyph:{color:"#888",fontSize:23},closeGlyph:{color:"#fff",fontSize:32,lineHeight:34},filmGlyph:{color:"#777",fontSize:42},textGlyph:{color:"#fff",fontSize:10,fontWeight:"800"},
 search:{margin:16,height:46,borderRadius:8,borderWidth:1,borderColor:"#303030",backgroundColor:"#151515",paddingHorizontal:13,flexDirection:"row",alignItems:"center"},input:{flex:1,color:"#fff",marginLeft:9,fontSize:15},
 hero:{paddingHorizontal:18,paddingTop:8,paddingBottom:20},kicker:{fontSize:11,fontWeight:"800",letterSpacing:2,color:"#aaa"},heroTitle:{fontSize:36,lineHeight:39,fontWeight:"900",color:"#fff",marginTop:8},heroText:{fontSize:14,lineHeight:21,color:"#aaa",marginTop:10},
 grid:{paddingHorizontal:16,paddingBottom:35},section:{fontSize:21,fontWeight:"800",color:"#fff",marginBottom:14},card:{width:"48.2%",marginBottom:22},poster:{width:"100%",aspectRatio:2/3,borderRadius:7,backgroundColor:"#1c1c1c"},title:{color:"#fff",fontSize:14,fontWeight:"700",marginTop:8,lineHeight:19},meta:{color:"#777",fontSize:11,marginTop:4},empty:{color:"#777",paddingTop:40,textAlign:"center",width:"100%"},error:{color:"#ff8c8c",paddingHorizontal:18,paddingBottom:8},
 modal:{flex:1,backgroundColor:"#080808"},modalHeader:{height:60,paddingHorizontal:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},modalTitle:{color:"#fff",fontSize:18,fontWeight:"800",flex:1,marginRight:15},video:{width:"100%",aspectRatio:16/9,backgroundColor:"#000"},noVideo:{aspectRatio:16/9,alignItems:"center",justifyContent:"center",padding:35,backgroundColor:"#050505"},noText:{color:"#888",textAlign:"center",marginTop:12,lineHeight:20},details:{padding:20},detailMeta:{color:"#aaa",fontSize:13},subHeading:{color:"#fff",fontSize:16,fontWeight:"800",marginTop:20},subs:{marginTop:10,gap:8},subBtn:{minHeight:40,borderWidth:1,borderColor:"#333",borderRadius:7,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#141414"},subActive:{borderColor:"#e50914"},subText:{color:"#fff",fontSize:13},subStatus:{color:"#777",fontSize:13,marginTop:10},detailText:{color:"#888",fontSize:13,lineHeight:20,marginTop:12}
});